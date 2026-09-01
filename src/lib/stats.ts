/**
 * Pure, testable derivations for the tracker.
 *
 * FIREWALL: the bet is decided ONLY by these functions reading real weigh-in /
 * check-in data. No game/flavor value is an input here.
 */

import { dayNumber, todaySG } from "./date";

/** Kilograms lost = start − latest weigh-in (never negative-clamped; gains show). */
export function lostKg(startWeight: number, latestWeighIn: number | null): number {
  if (latestWeighIn == null) return 0;
  return round1(startWeight - latestWeighIn);
}

/**
 * Progress toward goal as a 0–100 integer percent.
 *
 * Goals are SIGNED: a positive goal means "lose this many kg", a negative one
 * means "gain this many". `lost` carries the same sign convention (start − latest),
 * so someone bulking toward a −3 kg goal who is 1.5 kg heavier scores 50%, not 0.
 */
export function progressPct(lost: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((lost / goal) * 100)));
}

/**
 * Current streak = consecutive check-in days ending today or yesterday (group TZ).
 * Accepts any set of "YYYY-MM-DD" strings (order/duplicates don't matter).
 * Ending "yesterday" still counts as alive — today isn't over until midnight SG.
 */
export function streakDays(checkinDays: string[], today: string = todaySG()): number {
  if (checkinDays.length === 0) return 0;
  const byNum = new Set(checkinDays.map(dayNumber));
  const todayN = dayNumber(today);

  // The streak's most recent day must be today or yesterday to still be "alive".
  let cursor: number;
  if (byNum.has(todayN)) cursor = todayN;
  else if (byNum.has(todayN - 1)) cursor = todayN - 1;
  else return 0;

  // Walk backwards while consecutive days are present.
  let count = 0;
  while (byNum.has(cursor)) {
    count++;
    cursor--;
  }
  return count;
}

/** Days since the bet started (inclusive of day 1), in group-TZ calendar days. */
export function daysIn(startDay: string, today: string = todaySG()): number {
  return Math.max(1, dayNumber(today) - dayNumber(startDay) + 1);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
