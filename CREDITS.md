# Credits

## Exercise illustrations

The exercise figures in `public/exercises/` are derived from the
[workout-guide](https://github.com/bryllim/workout-guide) asset pack.

> Exercise illustrations by [Bryl Lim](https://bryllim.com), based on artwork from
> [Everkinetic](https://github.com/everkinetic/data).
> Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

**Changes made:** the original 512×512 PNGs were resized to 256×256 and re-encoded as
16-colour palette PNGs to cut the bundle from 32 MB to ~5 MB (see
`scripts/build-exercise-assets.mjs`). The artwork itself is unaltered. In the app the
figures are rendered as CSS masks tinted with the current theme's ink colour, so they
read correctly in both light and dark mode.

**ShareAlike:** these derived images remain licensed under CC BY-SA 4.0. Anyone
redistributing Verdant — including self-hosters — redistributes them, so this file must
travel with the repository. The licence applies to the images; Verdant's own source code
is a separate work and is not an adaptation of the artwork.

## Fonts

Hanken Grotesk and Instrument Serif, served via `next/font` from Google Fonts
([SIL Open Font License 1.1](https://openfontlicense.org/)).
