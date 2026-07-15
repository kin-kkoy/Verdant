/**
 * Verdant — game economy engine (Phase 3). The HOME of all game/flavor math,
 * mirroring how `stats.ts` is the home of the firewall.
 *
 * FIREWALL (non-negotiable):
 * - This module imports FROM `stats`/`date` and NEVER the reverse. Nothing here
 *   can change kg, check-ins, standings, or Pure Blooms.
 * - Bloom & Pure Bloom are a *read* of the real weigh-in truth plus a stored
 *   spend counter — they can never feed back into the bet.
 * - Idle/decay (Phase 3b) compute from a stored `last_seen` vs server `now`,
 *   never the client clock.
 *
 * All numbers below are TUNABLE starting values from SPECS §4.2 / §4.4.
 */

import { round1 } from "./stats";

// ---------- tunable constants (SPECS §4.2) ----------

export const EARN = {
  /** ☀️ Sun for showing up (once/day, folded into check-in). */
  checkinSun: 10,
  /** 💧 Water currency per exercise tag, capped per day. */
  exercisePerTag: 8,
  exerciseCap: 3, // → max +24 💧/day
  /** 🪱 Compost per wellness tag, capped per day. */
  wellnessPerTag: 5,
  wellnessCap: 3, // → max +15 🪱/day
} as const;

/** Costs for the tended garden (Phase 3a sinks; more in 3c). */
export const COST = {
  /** Plant a new tended pot (stage 0). */
  plantSeed: { water: 15, compost: 0, sun: 0 },
  /** Nudge a tended pot up one growth stage (≤ stage 4). */
  tendStage: { water: 5, compost: 0, sun: 0 },
} as const;

export const MAX_STAGE = 4; // 0 seed · 1 sprout · 2 leafing · 3 budding · 4 bloom

/**
 * Tag → soft-currency mapping (from `tags.ts` ACTIVITY_TAGS).
 * NOTE the name collision: the "Water" *activity tag* means hydration (a wellness
 * tag → earns 🪱 Compost). The 💧 Water *currency* is earned from EXERCISE tags.
 */
export const EXERCISE_TAGS = ["Workout", "Walk", "Yoga"] as const;
export const WELLNESS_TAGS = ["Clean eating", "Water", "Sleep"] as const;

// ---------- currency types ----------

export type Currencies = { sun: number; water: number; compost: number };
export type Earnings = Currencies;

const ZERO: Currencies = { sun: 0, water: 0, compost: 0 };

// ---------- earning (logging IS earning — no grind) ----------

/** ☀️ awarded for a daily check-in (idempotent per day — caller dedups). */
export function earnForCheckin(): Earnings {
  return { ...ZERO, sun: EARN.checkinSun };
}

/** 💧/🪱 awarded for a day's activity tags, with anti-spam daily caps. */
export function earnForTags(tags: string[]): Earnings {
  const ex = tags.filter((t) => (EXERCISE_TAGS as readonly string[]).includes(t)).length;
  const wl = tags.filter((t) => (WELLNESS_TAGS as readonly string[]).includes(t)).length;
  return {
    sun: 0,
    water: Math.min(ex, EARN.exerciseCap) * EARN.exercisePerTag,
    compost: Math.min(wl, EARN.wellnessCap) * EARN.wellnessPerTag,
  };
}

// ---------- Bloom (DERIVED from kg truth — the firewall read) ----------

/**
 * Pure Blooms = lifetime trophy, +1 per 0.5 kg lost, MONOTONIC (never drops even
 * if weight is regained). Earned Blooms (spendable, "protected, no decay") track
 * the same lifetime milestones. Both are derived from real weigh-ins only.
 *
 * @param seriesKg every logged weight (kg), any order
 * @param startWeight the user's baseline (kg)
 */
export function deriveBlooms(
  seriesKg: number[],
  startWeight: number,
): { pureBlooms: number; earnedBlooms: number } {
  let maxLost = 0;
  for (const w of seriesKg) maxLost = Math.max(maxLost, startWeight - w);
  const pureBlooms = Math.max(0, Math.floor(round1(maxLost) * 2));
  // Each 0.5 kg milestone grants +1 to BOTH counters (SPECS §4.1).
  return { pureBlooms, earnedBlooms: pureBlooms };
}

/** Spendable Bloom balance = lifetime earned − stored spend (never negative). */
export function bloomBalance(earnedBlooms: number, bloomSpent: number): number {
  return Math.max(0, earnedBlooms - bloomSpent);
}

// ---------- the BET garden (growth DERIVED from real kg) ----------

/**
 * Derive the bet garden's bed growth stages from real kg lost. Honest read of the
 * truth: "the garden grows as you lose." Returns one stage (0..MAX_STAGE) per bed.
 *
 * Layout (owner decision): 5 beds, ONE blooms per kg, scaled to the user's goal.
 * - goal ≤ 8 kg  → one bed per kg (e.g. 5 kg ⇒ 5 beds), each bed = 1 kg.
 * - goal > 8 kg  → 8 beds, each = goal/8 kg (keeps the scene sane on big goals).
 * - no goal      → open-ended: a bed per kg lost (+1 in-progress), capped at 8 for
 *                  layout, never "caps out" — it just keeps growing.
 */
export function betGardenStages(lostKg: number, goalKg: number | null): number[] {
  const lost = Math.max(0, lostKg);
  const VISUAL_MAX = 8;

  let bedCount: number;
  let kgPerBed: number;
  if (goalKg == null) {
    kgPerBed = 1;
    bedCount = Math.min(VISUAL_MAX, Math.max(1, Math.floor(lost) + 1));
  } else if (goalKg <= VISUAL_MAX) {
    kgPerBed = 1;
    bedCount = Math.max(1, Math.round(goalKg));
  } else {
    bedCount = VISUAL_MAX;
    kgPerBed = goalKg / VISUAL_MAX;
  }

  const beds: number[] = [];
  for (let i = 0; i < bedCount; i++) {
    const within = (lost - i * kgPerBed) / kgPerBed; // 0..1 progress through this bed's kg
    if (within >= 1) beds.push(MAX_STAGE);
    else if (within <= 0) beds.push(0);
    else beds.push(Math.min(MAX_STAGE - 1, Math.floor(within * MAX_STAGE)));
  }
  return beds;
}

// ---------- spending helpers (pure) ----------

export type SpendResult =
  | { ok: true; after: Currencies }
  | { ok: false; error: string };

/** Subtract a cost from balances if affordable. Pure — caller persists `after`. */
export function spend(balances: Currencies, cost: Partial<Currencies>): SpendResult {
  const need = { sun: cost.sun ?? 0, water: cost.water ?? 0, compost: cost.compost ?? 0 };
  if (balances.sun < need.sun || balances.water < need.water || balances.compost < need.compost) {
    return { ok: false, error: "Not enough resources yet — keep logging." };
  }
  return {
    ok: true,
    after: {
      sun: balances.sun - need.sun,
      water: balances.water - need.water,
      compost: balances.compost - need.compost,
    },
  };
}
