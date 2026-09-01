import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRACKERS,
  EMPTY_DAY,
  type DayActivity,
  type Trackers,
  level,
  points,
  targetPoints,
} from "./activity";

const day = (o: Partial<DayActivity> = {}): DayActivity => ({ ...EMPTY_DAY, ...o });

describe("points", () => {
  it("is 0 for a day with nothing logged", () => {
    expect(points(EMPTY_DAY)).toBe(0);
  });

  it("gives 1 each for a weigh-in, a check-in, and a workout", () => {
    expect(points(day({ weighed: true }))).toBe(1);
    expect(points(day({ checkedIn: true }))).toBe(1);
    expect(points(day({ workouts: 1 }))).toBe(1);
  });

  it("caps workouts at 2", () => {
    expect(points(day({ workouts: 2 }))).toBe(2);
    expect(points(day({ workouts: 5 }))).toBe(2);
  });

  it("caps meals at 3", () => {
    expect(points(day({ meals: 3 }))).toBe(3);
    expect(points(day({ meals: 9 }))).toBe(3);
  });

  it("ignores negative or fractional meal counts", () => {
    expect(points(day({ meals: -2 }))).toBe(0);
    expect(points(day({ meals: 2.7 }))).toBe(2);
  });

  it("tops out at 7 with every component", () => {
    expect(points(day({ weighed: true, checkedIn: true, meals: 3, workouts: 2 }))).toBe(7);
  });
});

describe("targetPoints", () => {
  it("excludes meals entirely when the user isn't tracking them", () => {
    expect(targetPoints({ mealsPerDay: null, tracksWorkouts: false })).toBe(2);
  });

  it("is 4 for the phase-1 default (weight + check-in + workout)", () => {
    expect(targetPoints(DEFAULT_TRACKERS)).toBe(4);
  });

  it("counts each tracked component", () => {
    expect(targetPoints({ mealsPerDay: 3, tracksWorkouts: true })).toBe(7);
    expect(targetPoints({ mealsPerDay: 2, tracksWorkouts: false })).toBe(4);
  });

  it("is never below 1, so level() can't divide by zero", () => {
    expect(targetPoints({ mealsPerDay: -5, tracksWorkouts: false })).toBeGreaterThanOrEqual(1);
  });
});

describe("level", () => {
  it("is 0 when nothing was logged", () => {
    expect(level(EMPTY_DAY)).toBe(0);
  });

  it("never exceeds 4, even when points overshoot the target", () => {
    const overshoot: Trackers = { mealsPerDay: null, tracksWorkouts: false }; // target 2
    expect(level(day({ weighed: true, checkedIn: true, meals: 3, workouts: 2 }), overshoot)).toBe(4);
  });

  it("lets a dieter and a lifter both reach the brightest square", () => {
    // Dieter: weight + check-in + 2 meals, no workouts. Target 4.
    const dieter: Trackers = { mealsPerDay: 2, tracksWorkouts: false };
    expect(level(day({ weighed: true, checkedIn: true, meals: 2 }), dieter)).toBe(4);

    // Lifter: weight + check-in + 3 meals + two workouts. Target 7.
    const lifter: Trackers = { mealsPerDay: 3, tracksWorkouts: true };
    expect(level(day({ weighed: true, checkedIn: true, meals: 3, workouts: 2 }), lifter)).toBe(4);

    // ...and the lifter's *partial* day is dimmer than their complete one.
    expect(level(day({ weighed: true, checkedIn: true }), lifter)).toBe(2);
  });

  it("spreads phase-1 days across the full 0–4 range", () => {
    // In phase 1 an exercise tag only exists on a day you checked in, so the
    // ladder has to climb via the *number* of workouts, not a single flag.
    expect(level(day({ weighed: true }))).toBe(1);
    expect(level(day({ weighed: true, checkedIn: true }))).toBe(2);
    expect(level(day({ weighed: true, checkedIn: true, workouts: 1 }))).toBe(3);
    expect(level(day({ weighed: true, checkedIn: true, workouts: 2 }))).toBe(4);
  });
});
