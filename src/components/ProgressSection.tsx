import type { Dashboard } from "@/lib/data";
import AccountMenu from "./AccountMenu";

// Server component — renders the "season so far" chart + goal ring from real
// weigh-in data. Chart/ring math ported from premium-mockup.html.
export default function ProgressSection({ d }: { d: Dashboard }) {
  const vals = d.series.map((p) => p.weight);
  const lostLabel = d.lost >= 0 ? `−${d.lost.toFixed(1)} kg` : `+${Math.abs(d.lost).toFixed(1)} kg`;
  const hasGoal = d.goalKg != null;
  // Goals are signed (negative = a gain goal); `lost` uses the same convention,
  // so the remaining distance is the same subtraction either way.
  const gaining = hasGoal && d.goalKg! < 0;
  const toGo = hasGoal ? Math.abs(Math.round((d.goalKg! - d.lost) * 10) / 10) : 0;
  const onTrack = hasGoal && (gaining ? d.lost <= d.goalKg! : d.lost >= d.goalKg!);
  const editable = d.mode === "official";

  return (
    <section className="section alt">
      <div className="wrap">
        <div className="prog-head">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="eyebrow">The season so far</div>
            <h2>
              {d.lost === 0 ? (
                <>
                  The <em>first weigh-in</em> starts the story.
                </>
              ) : d.lost > 0 ? (
                <>
                  Down <em>{d.lost.toFixed(1)} kg</em> since you started.
                </>
              ) : (
                <>
                  Up <em>{Math.abs(d.lost).toFixed(1)} kg</em> since you started.
                </>
              )}
            </h2>
            <p>
              Every weigh-in plotted. The scale is one signal — the squares above are the other.
            </p>
          </div>
          {editable ? <AccountMenu startWeight={d.startWeight} goalKg={d.goalKg} /> : null}
        </div>
        <div className="cols">
          <div className="card prog">
            <div className="big">
              <b className="num">{d.latestWeight != null ? d.latestWeight.toFixed(1) : "—"}</b>
              <span className="u">kg</span>
              <span className="delta">{lostLabel}</span>
            </div>
            <div className="cap">
              Started at {d.startWeight.toFixed(1)} kg ·{" "}
              {hasGoal
                ? `${toGo.toFixed(1)} kg to your ${Math.abs(d.goalKg!).toFixed(0)} kg ${
                    gaining ? "gain" : "loss"
                  } goal`
                : `${Math.abs(d.lost).toFixed(1)} kg ${d.lost < 0 ? "gained" : "lost"} so far · no goal set`}
            </div>
            <div style={{ marginTop: 20 }}>
              <Chart vals={vals} />
            </div>
          </div>
          <div className="card goal-card">
            {hasGoal ? (
              <>
                <Ring pct={d.pct ?? 0} />
                <div className="note">
                  {onTrack ? "Goal reached 🎉" : `${toGo.toFixed(1)} kg to go`}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Just tracking</div>
                <div className="note">No goal set — use ⋮ to add one anytime.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Chart({ vals }: { vals: number[] }) {
  const w = 560;
  const h = 180;
  const pad = 24;

  if (vals.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%">
        <text x={w / 2} y={h / 2} textAnchor="middle" fill="var(--faint)" fontSize="15">
          No weigh-ins yet — add one above.
        </text>
      </svg>
    );
  }

  const rawMax = Math.max(...vals);
  const rawMin = Math.min(...vals);
  const max = rawMax === rawMin ? rawMax + 1 : rawMax + 0.4;
  const min = rawMax === rawMin ? rawMin - 1 : rawMin - 0.4;
  const n = vals.length;
  const xs = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1));
  const ys = (v: number) => pad + ((max - v) / (max - min)) * (h - 2 * pad);

  const ln = vals.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(" ");
  const grid = [0, 1, 2, 3].map((g) => {
    const yy = pad + (g * (h - 2 * pad)) / 3;
    return <line key={g} x1={pad} y1={yy} x2={w - pad} y2={yy} stroke="var(--line)" strokeWidth="1" />;
  });
  const dots = vals.map((v, i) => (
    <circle
      key={i}
      cx={xs(i).toFixed(1)}
      cy={ys(v).toFixed(1)}
      r={i === n - 1 ? 4.5 : 2.6}
      fill={i === n - 1 ? "var(--accent)" : "var(--line-2)"}
    />
  ));
  const area = `${ln} L${xs(n - 1).toFixed(1)} ${h - pad} L${xs(0).toFixed(1)} ${h - pad}Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%">
      {grid}
      <path d={area} fill="var(--accent-soft)" />
      <path d={ln} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {dots}
    </svg>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div className="ring">
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        <circle
          cx="84"
          cy="84"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
          transform="rotate(-90 84 84)"
        />
      </svg>
      <div className="center">
        <b className="num">{pct}%</b>
        <span>to goal</span>
      </div>
    </div>
  );
}
