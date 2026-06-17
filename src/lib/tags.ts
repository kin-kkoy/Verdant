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
