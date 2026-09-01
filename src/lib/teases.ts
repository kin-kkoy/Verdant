/**
 * What someone sees when they open an invite-only profile they weren't invited to.
 *
 * Deliberately playful rather than stern — a locked profile in a small group is a
 * running joke, not a security boundary. Picked at random on every visit (no
 * storage, no seeding), so the same person gets a different jab each time.
 *
 * Kept generic (no names) since Verdant is self-hostable.
 */
export const TEASE_LINES = [
  "Is there actually something here? You'll never know.",
  "Nothing to see. Or everything. Hard to say from where you're standing.",
  "This profile is doing great things. Allegedly.",
  "Locked. Not personal — well, a little personal.",
  "You've reached the velvet rope. The list does not have your name on it.",
  "Somewhere behind this wall, squares are getting brighter.",
  "Access denied, but affectionately.",
  "Imagine a very impressive graph. Now stop imagining it.",
  "Could be a 200-day streak. Could be three sad squares. Mystery!",
  "You're not on the list, but you are in our hearts.",
  "Knock knock. (Nobody answers.)",
  "This one's playing their cards close to the chest.",
  "Come back when you've been invited. Bring snacks.",
  "The gains are private. The curiosity is yours to live with.",
  "Peeking is free. Seeing costs an invitation.",
] as const;

/** A random line, fresh on every call. */
export function randomTease(): string {
  return TEASE_LINES[Math.floor(Math.random() * TEASE_LINES.length)];
}
