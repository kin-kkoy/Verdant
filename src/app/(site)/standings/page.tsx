import { auth } from "@/lib/auth";
import { getStandings, getVisitorStandings, type Standing } from "@/lib/data";
import RefreshButton from "@/components/RefreshButton";

export const metadata = { title: "Standings · Verdant" };

function ago(day: string | null): string {
  if (!day) return "no weigh-in yet";
  return `weighed in ${day}`;
}

export default async function StandingsPage() {
  const session = await auth();
  const authed = !!session?.user?.id;
  const meId = authed ? Number(session!.user.id) : null;
  const rows: Standing[] = authed ? await getStandings() : getVisitorStandings();

  const leader = rows[0];

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="eyebrow">Standings</div>
        <h2>
          {leader ? (
            <>
              {leader.name}&apos;s <em>ahead</em> — for now.
            </>
          ) : (
            <>
              The <em>bet</em> awaits.
            </>
          )}
        </h2>
        <p>
          First to shed five kilograms takes the bet. No deadline; autumn&apos;s just the season
          you&apos;re aiming for.
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <RefreshButton />
      </div>
      <div className="card">
        {rows.map((r, i) => {
          const isMe = meId != null && r.id === meId;
          const hasGoal = r.goalKg != null && r.pct != null;
          const toGo = hasGoal ? Math.max(0, Math.round((r.goalKg! - r.lost) * 10) / 10) : 0;
          return (
            <div className="srow" key={r.id}>
              <span className="lead-tag" style={i === 0 ? undefined : { color: "var(--faint)" }}>
                {i === 0 ? "● Leading" : `${i + 1}${ordinal(i + 1)}`}
              </span>
              <div className="who">
                <span className="av" style={{ background: r.avatarColor }}>
                  {r.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="nm">
                    {r.name}
                    {isMe ? <span className="sub"> · you</span> : null}
                  </div>
                  <div className="sub">
                    {r.streak}-day streak · {ago(r.latestWeighInDay)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div className="prog2">
                  <div className="pl">
                    <span>
                      <b>
                        {r.lost >= 0 ? "−" : "+"}
                        {Math.abs(r.lost).toFixed(1)}
                      </b>{" "}
                      kg
                    </span>
                    <span>{hasGoal ? `${toGo.toFixed(1)} to go` : "tracking"}</span>
                  </div>
                  <div className="track">
                    {hasGoal ? <i style={{ width: `${r.pct}%`, background: r.avatarColor }} /> : null}
                  </div>
                </div>
                <div className="endkg num">{hasGoal ? `${r.pct}%` : "—"}</div>
              </div>
            </div>
          );
        })}
      </div>
      {!authed ? (
        <p style={{ color: "var(--faint)", fontSize: 13.5, marginTop: 16 }}>
          Guest view — these are sample standings. Sign in to see the real bet.
        </p>
      ) : null}
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}
