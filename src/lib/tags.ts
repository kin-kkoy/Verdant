/** The canonical activity tags shown on the check-in card (from the mockup). */
export const ACTIVITY_TAGS = [
  "Workout",
  "Walk",
  "Clean eating",
  "Water",
  "Sleep",
  "Yoga",
] as const;

export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

/**
 * Tags that count as "you moved today" for the contribution graph.
 * Phase 1 scores the workout component off these; Phase 2 replaces the source
 * with real workout sessions (exercise → sets → reps) and this stays as a
 * fallback for days logged before that shipped.
 */
export const EXERCISE_TAGS: readonly string[] = ["Workout", "Walk", "Yoga"];

/** How many distinct exercise tags a day carries (0–3). */
export function countExerciseTags(tags: readonly string[]): number {
  return new Set(tags.filter((t) => EXERCISE_TAGS.includes(t))).size;
}
