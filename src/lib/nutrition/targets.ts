/**
 * Daily calorie and protein targets. Pure — may import from stats/date, never
 * the reverse, same one-way rule as activity.ts.
 *
 * Calories use Mifflin-St Jeor (1990), the modern standard: estimate the energy
 * your body burns at rest from weight, height, age and sex, multiply by how much
 * you move, then adjust for which way you're trying to go. Protein doesn't come
 * from that formula at all — it's a simpler grams-per-kilogram rule.
 *
 * These are estimates for one person's own use, not clinical advice.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

/** How much you move, as a multiplier on resting burn. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Desk job, little exercise",
  light: "Light exercise 1–3 days a week",
  moderate: "Moderate exercise 3–5 days a week",
  active: "Hard exercise 6–7 days a week",
  very_active: "Physical job or twice-daily training",
};

/** Never recommend eating below this, whatever the maths says. */
export const ABSOLUTE_CALORIE_FLOOR = 1200;

export type BodyProfile = {
  weightKg: number;
  heightCm: number;
  /** Years. Derive with `ageFromBirthYear`. */
  age: number;
  sex: Sex;
  activity: ActivityLevel;
};

export type Targets = {
  calories: number;
  protein: number;
  /** Resting burn, shown so the number doesn't feel arbitrary. */
  bmr: number;
  /** Resting burn × activity — roughly what you burn in a day. */
  tdee: number;
  direction: "lose" | "gain" | "maintain";
  /** True when the deficit was clamped so the target stays safe to eat. */
  floored: boolean;
};

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return Math.max(0, now.getUTCFullYear() - birthYear);
}

/** Mifflin-St Jeor resting burn, in kcal/day. */
export function bmr(p: BodyProfile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : -161));
}

/** Resting burn scaled by how much you move. */
export function tdee(p: BodyProfile): number {
  return Math.round(bmr(p) * ACTIVITY_FACTORS[p.activity]);
}

/**
 * The day's targets.
 *
 * `goalKg` is the signed goal already stored on the user: positive means "lose
 * this many kg", negative means "gain this many", null means just tracking. So
 * the direction of the calorie adjustment falls straight out of it.
 */
export function dailyTargets(p: BodyProfile, goalKg: number | null): Targets {
  const rest = bmr(p);
  const burn = Math.round(rest * ACTIVITY_FACTORS[p.activity]);

  const direction: Targets["direction"] =
    goalKg == null || goalKg === 0 ? "maintain" : goalKg > 0 ? "lose" : "gain";

  const raw =
    direction === "lose" ? burn - 500 : direction === "gain" ? burn + 300 : burn;

  // A deficit should never push you under your resting burn, and never under the
  // absolute floor. Eating less than your body spends idling is where crash diets
  // live, and this app is not that.
  const min = Math.max(ABSOLUTE_CALORIE_FLOOR, rest);
  const calories = Math.max(min, raw);

  // More protein while cutting, to hold on to muscle in a deficit.
  const perKg = direction === "lose" ? 2.2 : 1.8;

  return {
    calories: Math.round(calories / 10) * 10,
    protein: Math.round(p.weightKg * perKg),
    bmr: rest,
    tdee: burn,
    direction,
    floored: calories > raw,
  };
}

/** Is there enough on the profile to compute a target at all? */
export function canComputeTargets(p: Partial<BodyProfile>): p is BodyProfile {
  return (
    typeof p.weightKg === "number" && p.weightKg > 0 &&
    typeof p.heightCm === "number" && p.heightCm > 0 &&
    typeof p.age === "number" && p.age > 0 &&
    (p.sex === "male" || p.sex === "female") &&
    typeof p.activity === "string" && p.activity in ACTIVITY_FACTORS
  );
}
