/**
 * Verdant — asset-agnostic rendering seam (Phase 3).
 *
 * Game logic NEVER references a file path. It renders by LOGICAL KEY (e.g.
 * `plant:marigold:4`, `decor:gnome`, `vessel:jar`). This manifest is the ONLY
 * place that maps a key to bundled art, so swapping the look — a CC0 pack OR the
 * owner's OWN assets — is a data edit here, never a change to the economy/scene.
 *
 * Resolution order (see `plants.tsx`): a registered file entry wins; otherwise we
 * fall back to the parametric SVG generator (zero binary assets → self-host clean,
 * light/dark for free via CSS palette vars).
 *
 * To bundle real art later: drop files under `public/garden/...` and add entries
 * here, e.g.
 *   "plant:marigold:4": { light: "/garden/marigold/4.svg", dark: "/garden/marigold/4-dark.svg" }
 * If a CC-BY pack is used, also add a `CREDITS.md`. (Phase 3a ships empty = generator.)
 */

export type AssetEntry = {
  /** Path under /public for the light-theme art. */
  light: string;
  /** Optional dark-theme variant; falls back to `light` if absent. */
  dark?: string;
};

// Empty in Phase 3a — the parametric generator renders everything until real art
// is bundled. Self-hosters can override any key here with no other code change.
export const ASSET_MANIFEST: Record<string, AssetEntry> = {};

/** Resolve a logical key to bundled art, or null to use the generator fallback. */
export function resolveAsset(key: string): AssetEntry | null {
  return ASSET_MANIFEST[key] ?? null;
}
