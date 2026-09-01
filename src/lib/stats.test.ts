import { describe, it, expect } from "vitest";
import { lostKg, progressPct, streakDays, daysIn, round1 } from "./stats";
import { todaySG, prevDay, dayNumber } from "./date";

describe("lostKg", () => {
  it("returns 0 when no weigh-in yet", () => {
    expect(lostKg(84.2, null)).toBe(0);
  });
  it("computes start − latest, rounded to 1dp", () => {
    expect(lostKg(84.2, 81.9)).toBe(2.3);
  });
  it("shows gains as negative", () => {
    expect(lostKg(80, 81)).toBe(-1);
  });
});

describe("progressPct", () => {
  it("clamps to 0..100", () => {
    expect(progressPct(-1, 5)).toBe(0);
    expect(progressPct(6, 5)).toBe(100);
  });
  it("rounds to integer percent", () => {
    expect(progressPct(2.3, 5)).toBe(46);
  });
  it("handles a zero goal", () => {
    expect(progressPct(2, 0)).toBe(0);
  });
  it("scores a gain goal (negative) the same way as a loss goal", () => {
    // Goal: gain 3 kg. `lost` is start − latest, so gaining 1.5 kg reads as -1.5.
    expect(progressPct(-1.5, -3)).toBe(50);
    expect(progressPct(-3, -3)).toBe(100);
    // Moving the wrong way (losing weight while bulking) scores 0, not negative.
    expect(progressPct(1.5, -3)).toBe(0);
  });
});

describe("streakDays", () => {
  const today = "2026-06-17";
  it("is 0 with no check-ins", () => {
    expect(streakDays([], today)).toBe(0);
  });
  it("counts a run ending today", () => {
    expect(streakDays(["2026-06-15", "2026-06-16", "2026-06-17"], today)).toBe(3);
  });
  it("stays alive when the latest day is yesterday", () => {
    expect(streakDays(["2026-06-15", "2026-06-16"], today)).toBe(2);
  });
  it("is dead when the latest day is two days ago", () => {
    expect(streakDays(["2026-06-14", "2026-06-15"], today)).toBe(0);
  });
  it("ignores gaps and duplicates, only counts the trailing run", () => {
    expect(
      streakDays(["2026-06-10", "2026-06-16", "2026-06-16", "2026-06-17"], today),
    ).toBe(2);
  });
});

describe("daysIn", () => {
  it("is inclusive of day 1", () => {
    expect(daysIn("2026-06-17", "2026-06-17")).toBe(1);
    expect(daysIn("2026-05-01", "2026-06-17")).toBe(48);
  });
});

describe("date helpers", () => {
  it("todaySG returns YYYY-MM-DD", () => {
    expect(todaySG()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("todaySG is correct across the UTC→SG boundary", () => {
    // 2026-06-17 23:30 UTC is already 2026-06-18 in Singapore (UTC+8).
    expect(todaySG(new Date("2026-06-17T23:30:00Z"))).toBe("2026-06-18");
    // 2026-06-17 10:00 UTC is still the 17th in Singapore.
    expect(todaySG(new Date("2026-06-17T10:00:00Z"))).toBe("2026-06-17");
  });
  it("prevDay handles month boundaries", () => {
    expect(prevDay("2026-06-01")).toBe("2026-05-31");
  });
  it("dayNumber is consecutive across a month boundary", () => {
    expect(dayNumber("2026-06-01") - dayNumber("2026-05-31")).toBe(1);
  });
});

describe("round1", () => {
  it("rounds to one decimal", () => {
    expect(round1(2.34)).toBe(2.3);
    expect(round1(2.35)).toBe(2.4);
  });
});
