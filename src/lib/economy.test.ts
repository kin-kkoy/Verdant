import { describe, it, expect } from "vitest";
import {
  earnForCheckin,
  earnForTags,
  deriveBlooms,
  bloomBalance,
  betGardenStages,
  spend,
  EARN,
  MAX_STAGE,
} from "./economy";

describe("earnForTags", () => {
  it("maps exercise tags → Water currency, wellness tags → Compost", () => {
    const e = earnForTags(["Workout", "Walk", "Clean eating", "Sleep"]);
    expect(e.water).toBe(2 * EARN.exercisePerTag);
    expect(e.compost).toBe(2 * EARN.wellnessPerTag);
    expect(e.sun).toBe(0);
  });
  it("treats the 'Water' activity tag as wellness (hydration → Compost), not the Water currency", () => {
    const e = earnForTags(["Water"]);
    expect(e.compost).toBe(EARN.wellnessPerTag);
    expect(e.water).toBe(0);
  });
  it("applies anti-spam daily caps", () => {
    const e = earnForTags(["Workout", "Walk", "Yoga", "Workout", "Walk"]); // 5 exercise
    expect(e.water).toBe(EARN.exerciseCap * EARN.exercisePerTag);
  });
  it("ignores unknown tags", () => {
    expect(earnForTags(["Nonsense"]).water).toBe(0);
  });
});

describe("earnForCheckin", () => {
  it("awards Sun only", () => {
    expect(earnForCheckin()).toEqual({ sun: EARN.checkinSun, water: 0, compost: 0 });
  });
});

describe("deriveBlooms (firewall read of kg truth)", () => {
  it("grants +1 per 0.5 kg lost, from the max loss ever (monotonic)", () => {
    // start 84, dipped to 81.9 → 2.1 lost → floor(2.1*2)=4
    const { pureBlooms, earnedBlooms } = deriveBlooms([84, 83, 81.9], 84);
    expect(pureBlooms).toBe(4);
    expect(earnedBlooms).toBe(4);
  });
  it("does not drop when weight is regained (Pure Bloom is monotonic)", () => {
    // hit 81.0 (3.0 lost = 6 blooms) then regained to 83.0
    expect(deriveBlooms([84, 81, 83], 84).pureBlooms).toBe(6);
  });
  it("is 0 with no loss", () => {
    expect(deriveBlooms([84, 84.5], 84).pureBlooms).toBe(0);
  });
});

describe("bloomBalance", () => {
  it("is earned − spent, never negative", () => {
    expect(bloomBalance(6, 2)).toBe(4);
    expect(bloomBalance(2, 5)).toBe(0);
  });
});

describe("betGardenStages (garden derived from real kg)", () => {
  it("renders one bed per kg for a 5 kg goal", () => {
    expect(betGardenStages(0, 5)).toHaveLength(5);
  });
  it("fully blooms a bed as each kg milestone is crossed", () => {
    const beds = betGardenStages(2, 5); // 2 kg lost
    expect(beds[0]).toBe(MAX_STAGE);
    expect(beds[1]).toBe(MAX_STAGE);
    expect(beds[2]).toBe(0); // not started
  });
  it("shows partial growth within the in-progress bed", () => {
    const beds = betGardenStages(0.5, 5); // halfway through bed 0
    expect(beds[0]).toBeGreaterThan(0);
    expect(beds[0]).toBeLessThan(MAX_STAGE);
  });
  it("scales bed count to a custom goal", () => {
    expect(betGardenStages(0, 3)).toHaveLength(3);
    expect(betGardenStages(0, 16).length).toBeLessThanOrEqual(8); // big goals stay sane
  });
  it("is open-ended with no goal (grows, never caps out)", () => {
    expect(betGardenStages(0, null)).toHaveLength(1);
    expect(betGardenStages(3, null).length).toBeGreaterThan(1);
  });
});

describe("spend", () => {
  it("rejects when unaffordable and leaves balances untouched", () => {
    const r = spend({ sun: 0, water: 5, compost: 0 }, { water: 15 });
    expect(r.ok).toBe(false);
  });
  it("subtracts the cost when affordable", () => {
    const r = spend({ sun: 0, water: 20, compost: 0 }, { water: 15 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.after.water).toBe(5);
  });
});
