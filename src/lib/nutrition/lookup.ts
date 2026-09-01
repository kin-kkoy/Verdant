/**
 * The food lookup cascade. Server-side.
 *
 *   1. your saved foods   instant, offline, and it's YOUR number for YOUR portion
 *   2. the bundled table  offline floor, Filipino staples included
 *   3. Open Food Facts    free, no key, no signup; filtered to the Philippines
 *
 * Each step only runs if the one before came up empty, so the common case never
 * touches the network — which matters, because this app is installed as a PWA and
 * gets used on phones with patchy signal.
 *
 * Whatever comes back is a SUGGESTION. The UI shows every number editable before
 * anything is written, and saving a meal offers to remember the foods that missed.
 */

import { findBundledFood, normalise, pickPortion } from "./foods";
import type { ParsedItem } from "./parse";
import type { MealItem } from "../db/schema";

export type FoodSource = MealItem["source"];

export type Resolved = {
  name: string;
  qty: number;
  unit: string | null;
  kcal: number;
  protein: number;
  source: FoodSource;
  /** False when nothing was found and the numbers are zeroes awaiting the user. */
  found: boolean;
};

/** A saved food, as the caller loads it from the `foods` table. */
export type SavedLookup = { name: string; unit: string | null; kcal: number; protein: number };

const OFF_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
/** Open Food Facts asks for a descriptive UA; be a good citizen. */
const OFF_UA = "Verdant/1.0 (self-hosted personal body tracker)";
const OFF_TIMEOUT_MS = 2500;
/** After a failure, stop calling Open Food Facts for this long. */
const OFF_COOLDOWN_MS = 5 * 60_000;

/**
 * Circuit breaker. Open Food Facts' text search is a free community service and
 * goes down (observed 503 on 2026-09-02 while their barcode API was fine). Without
 * this, every unknown food in every meal would sit waiting on a dead endpoint.
 * Module-level state, so it resets whenever the server does — which is the right
 * granularity for a flaky upstream.
 */
let offFailingUntil = 0;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Search Open Food Facts, restricted to products sold in the Philippines.
 * Returns per-serving figures where the product has them, else per 100g.
 *
 * Never throws: a lookup failure must degrade to "we don't know", not break the
 * meal the user is trying to log.
 */
export async function searchOpenFoodFacts(
  name: string,
): Promise<{ kcal: number; protein: number } | null> {
  const url =
    `${OFF_ENDPOINT}?search_terms=${encodeURIComponent(name)}` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=philippines` +
    `&fields=product_name,nutriments&page_size=3&json=1&search_simple=1&action=process`;

  if (Date.now() < offFailingUntil) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": OFF_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
      // Products barely change; let Next cache them for a day.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      offFailingUntil = Date.now() + OFF_COOLDOWN_MS;
      return null;
    }

    const data: unknown = await res.json();
    const products = (data as { products?: unknown[] })?.products;
    if (!Array.isArray(products)) return null;

    for (const p of products) {
      const n = (p as { nutriments?: Record<string, unknown> })?.nutriments;
      if (!n) continue;
      const kcal = Number(n["energy-kcal_serving"] ?? n["energy-kcal_100g"]);
      const protein = Number(n["proteins_serving"] ?? n["proteins_100g"]);
      if (Number.isFinite(kcal) && kcal > 0) {
        return {
          kcal: Math.round(kcal),
          protein: Number.isFinite(protein) ? round1(protein) : 0,
        };
      }
    }
    return null;
  } catch {
    // Offline, timed out, rate-limited, malformed — all the same to us.
    offFailingUntil = Date.now() + OFF_COOLDOWN_MS;
    return null;
  }
}

/**
 * Resolve one parsed item through the cascade.
 * `saved` is the user's own foods, passed in so the caller loads them once.
 */
export async function resolveItem(
  item: ParsedItem,
  saved: SavedLookup[],
  { allowNetwork = true }: { allowNetwork?: boolean } = {},
): Promise<Resolved> {
  const n = normalise(item.name);

  // 1. the user's own foods
  const mine = saved.find((f) => normalise(f.name) === n);
  if (mine) {
    return {
      name: item.name,
      qty: item.qty,
      unit: item.unit ?? mine.unit,
      kcal: Math.round(mine.kcal * item.qty),
      protein: round1(mine.protein * item.qty),
      source: "saved",
      found: true,
    };
  }

  // 2. the bundled table
  const bundled = findBundledFood(item.name);
  if (bundled) {
    const portion = pickPortion(bundled, item.unit);
    return {
      name: bundled.name,
      qty: item.qty,
      unit: item.unit ?? portion.unit,
      kcal: Math.round(portion.kcal * item.qty),
      protein: round1(portion.protein * item.qty),
      source: "bundled",
      found: true,
    };
  }

  // 3. Open Food Facts
  if (allowNetwork) {
    const off = await searchOpenFoodFacts(item.name);
    if (off) {
      return {
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        kcal: Math.round(off.kcal * item.qty),
        protein: round1(off.protein * item.qty),
        source: "openfoodfacts",
        found: true,
      };
    }
  }

  // Nothing knew it — hand back zeroes for the user to fill in once.
  return {
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    kcal: 0,
    protein: 0,
    source: "manual",
    found: false,
  };
}

/** Resolve a whole meal. Network lookups run in parallel. */
export async function resolveItems(
  items: ParsedItem[],
  saved: SavedLookup[],
  opts?: { allowNetwork?: boolean },
): Promise<Resolved[]> {
  return Promise.all(items.map((i) => resolveItem(i, saved, opts)));
}

export function totals(items: { kcal: number; protein: number }[]) {
  return {
    kcal: items.reduce((n, i) => n + i.kcal, 0),
    protein: round1(items.reduce((n, i) => n + i.protein, 0)),
  };
}
