/**
 * The single source of "today" for Verdant.
 *
 * The group timezone is fixed to Asia/Singapore (UTC+8). All streak / "day"
 * logic MUST go through these helpers — never hand-roll offsets or use a bare
 * `new Date()` for calendar-day decisions, or streaks break across midnight.
 */

export const GROUP_TZ = "Asia/Singapore";

// en-CA formats as YYYY-MM-DD, which is exactly our `date` column shape.
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: GROUP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in the group timezone, as "YYYY-MM-DD". */
export function todaySG(now: Date = new Date()): string {
  return fmt.format(now);
}

/** "YYYY-MM-DD" → days since the Unix epoch (for adjacency math). TZ-agnostic. */
export function dayNumber(isoDay: string): number {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Monday (group TZ) of the week containing `today`, as "YYYY-MM-DD". */
export function weekStartSG(today: string = todaySG()): string {
  const [y, m, d] = today.split("-").map(Number);
  // Day-of-week for the date at UTC noon (TZ-safe): 0=Sun…6=Sat.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const backToMon = (dow + 6) % 7; // Mon=0
  return prevDayN(today, backToMon);
}

/** Add N days to "YYYY-MM-DD" (N may be negative), returning "YYYY-MM-DD". */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Add N weeks to a week-start "YYYY-MM-DD". */
export function addWeeksIso(weekStart: string, n: number): string {
  return addDaysIso(weekStart, n * 7);
}

/** Whole-week difference: weeks from `base` to `a` (positive = a is later). */
export function weekDiff(a: string, base: string): number {
  return Math.round((dayNumber(a) - dayNumber(base)) / 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthDay(iso: string): { mo: number; d: number } {
  const [, m, d] = iso.split("-").map(Number);
  return { mo: m, d };
}

/** "Jun 16 – 22" or "Jun 30 – Jul 6" for the week beginning `weekStart`. */
export function weekRangeLabel(weekStart: string): string {
  const end = addDaysIso(weekStart, 6);
  const s = monthDay(weekStart);
  const e = monthDay(end);
  return s.mo === e.mo
    ? `${MONTHS[s.mo - 1]} ${s.d} – ${e.d}`
    : `${MONTHS[s.mo - 1]} ${s.d} – ${MONTHS[e.mo - 1]} ${e.d}`;
}

// Planner window: previous weeks (generous bound) … up to 3 weeks ahead.
export const PLANNER_WEEKS_AHEAD = 3;
export const PLANNER_WEEKS_BACK = 104;

/**
 * Normalize an arbitrary date string to its week's Monday and confirm it's within
 * the allowed planner window. Returns the valid weekStart, or null if invalid/out
 * of range. Used by both the planner page and the server actions (no trust in input).
 */
export function validPlannerWeek(
  req: string | undefined | null,
  current: string = weekStartSG(),
): string | null {
  if (!req || !/^\d{4}-\d{2}-\d{2}$/.test(req)) return null;
  const wk = weekStartSG(req);
  const diff = weekDiff(wk, current);
  if (diff > PLANNER_WEEKS_AHEAD || diff < -PLANNER_WEEKS_BACK) return null;
  return wk;
}

/** Day-of-week for "YYYY-MM-DD" with Monday=0 … Sunday=6 (group TZ). */
export function dowMonday0(isoDay: string = todaySG()): number {
  const [y, m, d] = isoDay.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Coarse, human relative time from a past timestamp (computed server-side). */
export function relativeFromNow(past: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - past.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}

/** N days before "YYYY-MM-DD". */
function prevDayN(isoDay: string, n: number): string {
  let cur = isoDay;
  for (let i = 0; i < n; i++) cur = prevDay(cur);
  return cur;
}

/** Day before the given "YYYY-MM-DD", as "YYYY-MM-DD". */
export function prevDay(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - 86_400_000;
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
