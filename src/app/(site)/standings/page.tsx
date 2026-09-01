import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  byKilograms,
  getStandings,
  getVisitorStandings,
  STANDINGS_WINDOW,
  type Standing,
} from "@/lib/data";
import RefreshButton from "@/components/RefreshButton";

export const metadata = { title: "Standings · Verdant" };

type View = "consistency" | "kg";

function ago(day: string | null): string {
  if (!day) return "no weigh-in yet";
  return `weighed in ${day}`;
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  const authed = !!session?.user?.id;
  const meId = authed ? Number(session!.user.id) : null;

  const { view: raw } = await searchParams;
  const view: View = raw === "kg" ? "kg" : "consistency";

  const all: Standing[] = authed ? await getStandings() : getVisitorStandings();
  const rows = view === "kg" ? byKilograms(all) : all;
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
              Nobody&apos;s <em>logged</em> a thing yet.
            </>
          )}
        </h2>
        <p>
          {view === "kg" ? (
            <>
              Kilograms against each person&apos;s own goal — losing or gaining. It&apos;s a
              second opinion, not the scoreboard: the scale can&apos;t tell muscle from anything
              else.
            </>
          ) : (
            <>
              Ranked by showing up: days logged in the last {STANDINGS_WINDOW}, then total
              points, then streak. The one measure that&apos;s fair whichever way your weight is
              headed.
            </>
          )}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="viewtabs">
          <Link href="/standings" className={view === "consistency" ? "on" : ""}>
            Consistency
          </Link>
          <Link href="/standings?view=kg" className={view === "kg" ? "on" : ""}>
            Kilograms
          </Link>
        </div>
        <RefreshButton />
      </div>

      <div className="card">
        {rows.map((r, i) => {
          const isMe = meId != null && r.id === meId;
          const hasGoal = r.goalKg != null && r.pct != null;
          const gaining = r.goalKg != null && r.goalKg < 0;
          const toGo = hasGoal ? Math.max(0, Math.round((r.goalKg! - r.lost) * 10) / 10) : 0;
          // Consistency bar is the window filled in; kg bar is progress to goal.
          const barPct =
            view === "kg"
              ? hasGoal
                ? r.pct!
                : null
              : Math.round((r.activeDays30 / STANDINGS_WINDOW) * 100);
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
                    {authed ? <Link href={`/profile/${r.id}`}>{r.name}</Link> : r.name}
                    {isMe ? <span className="sub"> · you</span> : null}
                  </div>
                  <div className="sub">
                    {view === "kg"
                      ? `${r.streak}-day streak · ${ago(r.latestWeighInDay)}`
                      : `${r.streak}-day streak · ${r.points30} points`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div className="prog2">
                  <div className="pl">
                    {view === "kg" ? (
                      <>
                        <span>
                          <b>
                            {r.lost >= 0 ? "−" : "+"}
                            {Math.abs(r.lost).toFixed(1)}
                          </b>{" "}
                          kg
                        </span>
                        <span>
                          {hasGoal
                            ? `${Math.abs(toGo).toFixed(1)} to ${gaining ? "gain" : "go"}`
                            : "tracking"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          <b>{r.activeDays30}</b> of {STANDINGS_WINDOW} days
                        </span>
                        <span>{r.points30} pts</span>
                      </>
                    )}
                  </div>
                  <div className="track">
                    {barPct != null ? (
                      <i style={{ width: `${barPct}%`, background: r.avatarColor }} />
                    ) : null}
                  </div>
                </div>
                <div className="endkg num">
                  {view === "kg" ? (hasGoal ? `${r.pct}%` : "—") : `${barPct}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!authed ? (
        <p style={{ color: "var(--faint)", fontSize: 13.5, marginTop: 16 }}>
          Guest view — these are sample standings. Sign in to see the real board.
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
