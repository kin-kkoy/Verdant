/**
 * Verdant — parametric plant generator (SPECS §4.6). The DEFAULT renderer behind
 * the asset seam: plants are pure SVG functions of `{species, stage}`, filled with
 * the app's CSS palette vars so light/dark shift for free and nothing binary ships.
 *
 * "One engine, many worlds": growth stage (0..4) is universal so the bet stays fair
 * and comparable; only the rendering (species params, or a bundled file override via
 * `assets.ts`) is personal. See `PlantArt` for the file→generator resolution.
 *
 * Coordinate convention: each plant draws around origin (0,0) = soil line, growing
 * UPWARD (negative y). The scene translates the <g> into position and scales it.
 */

import type { JSX } from "react";
import { resolveAsset } from "./assets";

export type BloomShape = "disc" | "star" | "bell" | "none";

export type Species = {
  id: string;
  name: string;
  /** stem/leaf use CSS vars (theme-aware); bloom is a saturated color that reads in both themes. */
  leaf: string;
  stem: string;
  bloom: string;
  bloomShape: BloomShape;
};

// Six starter species (free set — everyone looks good day one; premium/rare gated later).
export const SPECIES: Species[] = [
  { id: "marigold", name: "Marigold", leaf: "var(--olive)", stem: "var(--olive)", bloom: "var(--accent)", bloomShape: "disc" },
  { id: "aster", name: "Aster", leaf: "var(--olive)", stem: "var(--olive)", bloom: "#b48ed9", bloomShape: "star" },
  { id: "poppy", name: "Poppy", leaf: "var(--olive)", stem: "var(--olive)", bloom: "var(--rust)", bloomShape: "disc" },
  { id: "bluebell", name: "Bluebell", leaf: "var(--olive)", stem: "var(--olive)", bloom: "#6f8fd9", bloomShape: "bell" },
  { id: "daisy", name: "Daisy", leaf: "var(--olive)", stem: "var(--olive)", bloom: "var(--gold)", bloomShape: "star" },
  { id: "fern", name: "Fern", leaf: "var(--olive)", stem: "var(--olive)", bloom: "var(--olive)", bloomShape: "none" },
];

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

/** Pick a species by id, falling back to a stable default. */
export function speciesById(id: string): Species {
  return BY_ID.get(id) ?? SPECIES[0];
}

/** Deterministic species for a bed index (variety without storage). */
export function speciesForBed(index: number): Species {
  return SPECIES[index % SPECIES.length];
}

const STAGE_LABEL = ["Seedling", "Sprouting", "Leafing", "Budding", "In bloom"];
export function stageLabel(stage: number): string {
  return STAGE_LABEL[Math.max(0, Math.min(4, stage))];
}

/**
 * The generator. Returns an SVG <g> for one plant of `species` at `stage` (0..4).
 * Pure + deterministic (key suffix keeps gradients/ids stable if added later).
 */
export function genPlant(species: Species, stage: number, keyBase = "p"): JSX.Element {
  const s = Math.max(0, Math.min(4, Math.round(stage)));
  // Stem height grows with stage; leaves accrue; bud at 3, open bloom at 4.
  const stemH = [10, 22, 34, 44, 50][s];
  const leafCount = [0, 2, 4, 5, 6][s];
  const els: JSX.Element[] = [];

  // soil mound
  els.push(<ellipse key={`${keyBase}-soil`} cx="0" cy="2" rx="16" ry="5" fill="#6f5230" opacity="0.55" />);

  // stem
  if (s >= 1) {
    els.push(
      <line key={`${keyBase}-stem`} x1="0" y1="0" x2="0" y2={-stemH} stroke={species.stem} strokeWidth="3" strokeLinecap="round" />,
    );
  }

  // leaves alternate up the stem
  for (let k = 0; k < leafCount; k++) {
    const t = (k + 1) / (leafCount + 1);
    const y = -stemH * t;
    const dir = k % 2 === 0 ? 1 : -1;
    els.push(
      <ellipse
        key={`${keyBase}-l${k}`}
        cx={dir * 8}
        cy={y}
        rx="9"
        ry="4.5"
        fill={species.leaf}
        transform={`rotate(${dir * -28} ${dir * 8} ${y})`}
      />,
    );
  }

  // seedling (stage 0): just a sprout pair
  if (s === 0) {
    els.push(<ellipse key={`${keyBase}-s1`} cx="-3.5" cy="-5" rx="5" ry="3" fill={species.leaf} transform="rotate(-30 -3.5 -5)" />);
    els.push(<ellipse key={`${keyBase}-s2`} cx="3.5" cy="-5" rx="5" ry="3" fill={species.leaf} transform="rotate(30 3.5 -5)" />);
  }

  // bud (stage 3) / open bloom (stage 4)
  const top = -stemH;
  if (s === 3 && species.bloomShape !== "none") {
    els.push(<ellipse key={`${keyBase}-bud`} cx="0" cy={top - 3} rx="5" ry="7" fill={species.bloom} opacity="0.9" />);
    els.push(<path key={`${keyBase}-sep`} d={`M-4 ${top + 2} q4 -8 8 0`} fill={species.leaf} />);
  }
  if (s === 4) {
    els.push(...bloomEls(species, top, `${keyBase}-bl`));
  }

  return <g>{els}</g>;
}

function bloomEls(species: Species, top: number, key: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  if (species.bloomShape === "none") {
    // leafy crown (e.g. fern)
    for (let i = 0; i < 5; i++) {
      const a = -90 + (i - 2) * 26;
      out.push(
        <ellipse key={`${key}-f${i}`} cx="0" cy={top} rx="3.5" ry="11" fill={species.leaf} transform={`rotate(${a} 0 ${top})`} />,
      );
    }
    return out;
  }
  if (species.bloomShape === "bell") {
    for (let i = 0; i < 3; i++) {
      out.push(<path key={`${key}-b${i}`} d={`M${-6 + i * 6} ${top} q3 9 3 9 q0 0 3 -9`} fill={species.bloom} />);
    }
    return out;
  }
  // disc & star: petals around a center
  const petals = species.bloomShape === "star" ? 6 : 8;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * 360;
    out.push(
      <ellipse
        key={`${key}-p${i}`}
        cx="0"
        cy={top - 8}
        rx={species.bloomShape === "star" ? 3.2 : 4.5}
        ry="8"
        fill={species.bloom}
        transform={`rotate(${a} 0 ${top})`}
      />,
    );
  }
  out.push(<circle key={`${key}-c`} cx="0" cy={top} r="4" fill="var(--gold)" />);
  return out;
}

/**
 * Resolve a plant to art. A bundled file (CC0 pack / owner's own) wins; otherwise
 * the generator renders. `dark` selects the dark-theme variant for file art.
 */
export function PlantArt({
  speciesId,
  stage,
  dark = false,
  keyBase = "p",
}: {
  speciesId: string;
  stage: number;
  dark?: boolean;
  keyBase?: string;
}): JSX.Element {
  const file = resolveAsset(`plant:${speciesId}:${Math.round(stage)}`);
  if (file) {
    const href = dark ? file.dark ?? file.light : file.light;
    // Centered file art (size matches the generator's rough footprint).
    return <image href={href} x="-26" y="-58" width="52" height="60" preserveAspectRatio="xMidYMax meet" />;
  }
  return genPlant(speciesById(speciesId), stage, keyBase);
}
