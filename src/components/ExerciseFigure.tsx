import { figureUrl } from "@/lib/exercises/catalog";

/**
 * An exercise figure.
 *
 * The bundled artwork is WHITE line art on a transparent background — dropped
 * onto the cream `--bg` as an <img> it would be completely invisible. So each
 * frame is used as a CSS mask and painted with a theme token instead, which also
 * means the figures follow light/dark for free with no second colour variant.
 *
 * `animate` stacks all three frames and flips between them with discrete keyframes
 * (a flipbook, not a crossfade). Cards in the grid stay still on purpose — twenty
 * looping figures at once fights the "must not feel laggy" rule in NOTES.
 */
export default function ExerciseFigure({
  slug,
  image,
  name,
  animate = false,
  frames = 3,
}: {
  slug: string | null;
  /** Data URL for a custom exercise. Rendered as a plain image, not a mask. */
  image?: string | null;
  name: string;
  animate?: boolean;
  frames?: number;
}) {
  if (!slug) {
    if (image) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img className="exfig-photo" src={image} alt={name} />;
    }
    return (
      <div className="exfig-empty" aria-hidden>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  const count = animate ? Math.max(1, Math.min(3, frames)) : 1;

  return (
    <div className={`exfig-wrap${count > 1 ? " playing" : ""}`} role="img" aria-label={name}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="exfig"
          style={
            {
              "--fig": `url(${figureUrl(slug, i + 1)})`,
              "--i": i,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
