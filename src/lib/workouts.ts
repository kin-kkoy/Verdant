/**
 * Pure workout derivations. Sits beside stats.ts / activity.ts; may import from
 * them, never the reverse.
 */

import { MAX_WORKOUTS } from "./activity";
import { countExerciseTags } from "./tags";
import type { ExerciseUnit } from "./db/schema";

/**
 * How many workouts a day is worth for the contribution graph.
 *
 * Two sources, and we take the larger:
 *  - `exerciseIds` — distinct exercise cards logged that day (the real signal).
 *  - `tags` — the day's check-in tags, which was the ONLY source before workout
 *    cards existed. `docs/ISSUES.md` requires keeping it so days logged before
 *    this shipped don't silently dim.
 *
 * Taking the max rather than branching means there's no cutover date to reason
 * about: a day scores on whichever evidence is stronger.
 */
export function workoutsForDay(
  exerciseIds: Iterable<number>,
  tags: readonly string[] = [],
): number {
  const distinct = new Set(exerciseIds).size;
  return Math.min(MAX_WORKOUTS, Math.max(distinct, countExerciseTags(tags)));
}

/** "3 sets × 15 reps" / "3 sets × 45 seconds" — the card's subtitle. */
export function describeCard(sets: number, amount: number, unit: ExerciseUnit): string {
  const noun = unit === "seconds" ? (amount === 1 ? "second" : "seconds") : "reps";
  return `${sets} ${sets === 1 ? "set" : "sets"} × ${amount} ${noun}`;
}
