/**
 * Pure scoring for the contribution graph (the "how bright is today's square"
 * question). Sits beside stats.ts; may import from stats.ts / date.ts, never
 * the reverse — the same one-way rule the old economy module followed.
 *
 * Two rules keep the graph honest:
 *
 *  1. POINTS AND SHADES ARE SEPARATE. Points run 0–7 internally, but the graph
 *     only ever draws 4 filled shades plus empty (GitHub's scale). More shades
 *     than that are indistinguishable to the eye.
 *
 *  2. THE BRIGHTEST SQUARE MEANS "YOU DID *YOUR* DAY", not "you did the most
 *     possible". Level is points measured against the user's own target, which
 *     is derived from the trackers they actually use. A dieter logging two
 *     meals reaches full brightness; someone lifting needs a workout too.
 *     Everyone can reach level 4 by completing their own card.
 */

/** What a user actually did on one calendar day (group TZ). */
export type DayActivity = {
  weighed: boolean;
  checkedIn: boolean;
  /** Meals logged that day. Phase 2; always 0 until meal logging ships. */
  meals: number;
  /**
   * Workouts that day. Phase 1 counts the day's distinct exercise tags
   * (Workout / Walk / Yoga); Phase 2 counts real workout sessions.
   *
   * It has to be a COUNT, not a flag: a tag can only exist on a day you also
   * checked in, so a boolean would make points jump 2 → 4 and leave the
   * second-brightest shade unreachable.
   */
  workouts: number;
};

/**
 * Which components count toward this user's daily target.
 * `mealsPerDay: null` = the user isn't tracking meals yet, so meals are left
 * out of the target entirely (otherwise the top shade would be unreachable
 * before Phase 2 ships meal logging).
 */
export type Trackers = {
  mealsPerDay: number | null;
  tracksWorkouts: boolean;
};

/** Phase-1 default: weight + check-in + workout (from tags), no meals yet. */
export const DEFAULT_TRACKERS: Trackers = { mealsPerDay: null, tracksWorkouts: true };

/** Meals stop earning after this many in a day. */
export const MAX_MEALS = 3;
/** Workouts stop earning after this many in a day. */
export const MAX_WORKOUTS = 2;
/** Filled shades on the graph (plus level 0 = empty). */
export const MAX_LEVEL = 4;

export const EMPTY_DAY: DayActivity = {
  weighed: false,
  checkedIn: false,
  meals: 0,
  workouts: 0,
};

/** Raw points for a day: 0–7 when every component is in play. */
export function points(a: DayActivity): number {
  return (
    (a.weighed ? 1 : 0) +
    (a.checkedIn ? 1 : 0) +
    Math.min(MAX_MEALS, Math.max(0, Math.floor(a.meals))) +
    Math.min(MAX_WORKOUTS, Math.max(0, Math.floor(a.workouts)))
  );
}

/** The points a complete day is worth for this user. Always at least 1. */
export function targetPoints(t: Trackers): number {
  const meals = t.mealsPerDay == null ? 0 : Math.max(0, Math.floor(t.mealsPerDay));
  return Math.max(1, 1 + 1 + meals + (t.tracksWorkouts ? MAX_WORKOUTS : 0));
}

/**
 * The target for ONE day, widened to include anything the user actually did.
 *
 * Without this, logging a component you've switched off scores points against a
 * target that excludes them — so a workouts-off user who logs two workouts hits
 * the brightest square on work their own card never asked for. Widening the
 * target for that day keeps the ratio honest: you get credit for the work, but
 * you also have to have done the rest of your day to fill the square.
 */
function effectiveTrackers(a: DayActivity, t: Trackers): Trackers {
  const meals = Math.min(MAX_MEALS, Math.max(0, Math.floor(a.meals)));
  return {
    mealsPerDay: t.mealsPerDay ?? (meals > 0 ? meals : null),
    tracksWorkouts: t.tracksWorkouts || a.workouts > 0,
  };
}

/** 0 (nothing logged) … 4 (a complete day for this user). */
export function level(a: DayActivity, t: Trackers = DEFAULT_TRACKERS): number {
  const p = points(a);
  if (p <= 0) return 0;
  return Math.min(MAX_LEVEL, Math.ceil((MAX_LEVEL * p) / targetPoints(effectiveTrackers(a, t))));
}
