import { addDaysIso, dayNumber, dowMonday0 } from "@/lib/date";
import { MAX_LEVEL } from "@/lib/activity";
import type { ActivityCalendar } from "@/lib/data";
import GraphScroll from "./GraphScroll";

/**
 * The contribution graph — a year of day-squares that brighten with how much of
 * your own daily card you completed (see src/lib/activity.ts for the scoring).
 *
 * Hand-written inline SVG, matching the house convention (the progress chart in
 * ProgressSection is the same). No chart library.
 */

const CELL = 11; // square edge
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 28; // gutter for Mon/Wed/Fri labels
const TOP = 17; // strip for month labels

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_LABELS: Record<number, string> = { 0: "Mon", 2: "Wed", 4: "Fri" };

function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

function label(day: string, points: number): string {
  if (points <= 0) return `No activity · ${day}`;
  return `${points} point${points === 1 ? "" : "s"} · ${day}`;
}

export default function ActivityGraph({
  cal,
  caption,
}: {
  cal: ActivityCalendar;
  caption?: string;
}) {
  // The grid is whole weeks: start at the Monday on/before the window start.
  const gridStart = addDaysIso(cal.from, -dowMonday0(cal.from));
  const span = dayNumber(cal.to) - dayNumber(gridStart) + 1;
  const weeks = Math.ceil(span / 7);

  const byDay = new Map(cal.days.map((d) => [d.day, d]));
  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;

  // One month label per column where the month first changes, with a little
  // breathing room so short months don't collide.
  const monthTicks: { x: number; text: string }[] = [];
  let lastMonth = 0;
  let lastX = -Infinity;
  for (let w = 0; w < weeks; w++) {
    const iso = addDaysIso(gridStart, w * 7);
    const m = monthOf(iso);
    const x = LEFT + w * STEP;
    if (m !== lastMonth && x - lastX >= STEP * 3) {
      monthTicks.push({ x, text: MONTHS[m - 1] });
      lastX = x;
    }
    lastMonth = m;
  }

  return (
    <section className="section graph">
      <div className="wrap">
        <div className="card">
          <div className="graphhead">
            <div>
              <strong className="num">{cal.activeDays}</strong> active day
              {cal.activeDays === 1 ? "" : "s"} in the last year
            </div>
            <div className="sub">
              {cal.currentStreak}-day streak · longest {cal.longestStreak}
            </div>
          </div>

          <GraphScroll>
            <svg
              className="cgraph"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${cal.activeDays} active days in the last year`}
            >
              {monthTicks.map((t) => (
                <text key={t.x} x={t.x} y={11} className="clabel">
                  {t.text}
                </text>
              ))}
              {[0, 2, 4].map((row) => (
                <text
                  key={row}
                  x={LEFT - 6}
                  y={TOP + row * STEP + CELL - 1}
                  className="clabel"
                  textAnchor="end"
                >
                  {DOW_LABELS[row]}
                </text>
              ))}

              {Array.from({ length: weeks }, (_, w) =>
                Array.from({ length: 7 }, (_, row) => {
                  const iso = addDaysIso(gridStart, w * 7 + row);
                  // Leading/trailing cells outside the window are simply not drawn.
                  const d = byDay.get(iso);
                  if (!d) return null;
                  return (
                    <rect
                      key={iso}
                      x={LEFT + w * STEP}
                      y={TOP + row * STEP}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      className={`csq l${d.level}`}
                    >
                      <title>{label(iso, d.points)}</title>
                    </rect>
                  );
                }),
              )}
            </svg>
          </GraphScroll>

          <div className="graphfoot">
            <span className="sub">{caption ?? "Brighter means more of your day logged."}</span>
            <span className="legend">
              Less
              <svg width={(MAX_LEVEL + 1) * STEP} height={CELL} aria-hidden="true">
                {Array.from({ length: MAX_LEVEL + 1 }, (_, l) => (
                  <rect
                    key={l}
                    x={l * STEP}
                    y={0}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    className={`csq l${l}`}
                  />
                ))}
              </svg>
              More
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
