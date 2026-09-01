import { describe, expect, it } from "vitest";
import { describeCard, workoutsForDay } from "./workouts";
import { MAX_WORKOUTS } from "./activity";

describe("workoutsForDay", () => {
  it("is 0 with no cards logged and no tags", () => {
    expect(workoutsForDay([], [])).toBe(0);
  });

  it("counts distinct cards, not completions", () => {
    expect(workoutsForDay([7, 7, 7])).toBe(1);
    expect(workoutsForDay([7, 9])).toBe(2);
  });

  it("caps at MAX_WORKOUTS", () => {
    expect(workoutsForDay([1, 2, 3, 4, 5])).toBe(MAX_WORKOUTS);
  });

  it("still scores days that only have the old check-in tags", () => {
    // The pre-workout-cards path: docs/ISSUES.md requires it keeps working.
    expect(workoutsForDay([], ["Workout"])).toBe(1);
    expect(workoutsForDay([], ["Workout", "Walk"])).toBe(2);
    expect(workoutsForDay([], ["Water", "Sleep"])).toBe(0);
  });

  it("takes whichever evidence is stronger", () => {
    // One card logged, two exercise tags ticked -> the tags win.
    expect(workoutsForDay([7], ["Workout", "Yoga"])).toBe(2);
    // Two cards logged, one tag -> the cards win.
    expect(workoutsForDay([7, 9], ["Walk"])).toBe(2);
  });
});

describe("describeCard", () => {
  it("reads as reps for counted moves", () => {
    expect(describeCard(3, 15, "reps")).toBe("3 sets × 15 reps");
  });

  it("reads as seconds for timed moves", () => {
    expect(describeCard(3, 45, "seconds")).toBe("3 sets × 45 seconds");
    expect(describeCard(1, 1, "seconds")).toBe("1 set × 1 second");
  });
});
