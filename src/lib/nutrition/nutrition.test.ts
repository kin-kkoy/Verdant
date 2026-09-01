import { describe, expect, it } from "vitest";
import { ageFromBirthYear, bmr, canComputeTargets, dailyTargets, type BodyProfile } from "./targets";
import { parseItem, parseMeal } from "./parse";
import { findBundledFood, pickPortion } from "./foods";
import { readLabel, wholePack } from "./label";

const base: BodyProfile = {
  weightKg: 70,
  heightCm: 170,
  age: 25,
  sex: "male",
  activity: "light",
};

describe("targets", () => {
  it("computes Mifflin-St Jeor resting burn", () => {
    // 10*70 + 6.25*170 - 5*25 + 5 = 1642.5 -> 1643
    expect(bmr(base)).toBe(1643);
    expect(bmr({ ...base, sex: "female" })).toBe(1477);
  });

  it("subtracts a deficit when losing and adds a surplus when gaining", () => {
    const lose = dailyTargets(base, 5);
    const gain = dailyTargets(base, -3);
    const hold = dailyTargets(base, null);
    expect(lose.direction).toBe("lose");
    expect(gain.direction).toBe("gain");
    expect(hold.direction).toBe("maintain");
    expect(lose.calories).toBeLessThan(hold.calories);
    expect(gain.calories).toBeGreaterThan(hold.calories);
  });

  it("asks for more protein while cutting", () => {
    expect(dailyTargets(base, 5).protein).toBe(154); // 70 * 2.2
    expect(dailyTargets(base, null).protein).toBe(126); // 70 * 1.8
  });

  it("never recommends eating below resting burn", () => {
    // A small, sedentary person on a deficit: the raw maths would go under BMR.
    const small: BodyProfile = {
      weightKg: 45, heightCm: 150, age: 55, sex: "female", activity: "sedentary",
    };
    const t = dailyTargets(small, 5);
    expect(t.calories).toBeGreaterThanOrEqual(t.bmr);
    expect(t.calories).toBeGreaterThanOrEqual(1200);
    expect(t.floored).toBe(true);
  });

  it("knows when the profile is too thin to compute anything", () => {
    expect(canComputeTargets({ weightKg: 70 })).toBe(false);
    expect(canComputeTargets(base)).toBe(true);
  });

  it("derives age from a birth year", () => {
    expect(ageFromBirthYear(2000, new Date("2026-09-02T00:00:00Z"))).toBe(26);
  });
});

describe("parse", () => {
  it("reads a quantity, unit and food", () => {
    expect(parseItem("2 cups of rice")).toMatchObject({ qty: 2, unit: "cup", name: "rice" });
    expect(parseItem("a bowl of munggo")).toMatchObject({ qty: 1, unit: "bowl", name: "munggo" });
    expect(parseItem("3 eggs")).toMatchObject({ qty: 3, unit: null, name: "eggs" });
  });

  it("handles fractions and glued units", () => {
    expect(parseItem("1/2 cup rice")).toMatchObject({ qty: 0.5, unit: "cup" });
    expect(parseItem("300g chicken")).toMatchObject({ qty: 300, unit: "g", name: "chicken" });
  });

  it("defaults to one when no quantity is stated", () => {
    expect(parseItem("pandesal")).toMatchObject({ qty: 1, unit: null, name: "pandesal" });
  });

  it("splits a whole meal on commas and 'and'", () => {
    const items = parseMeal("a bowl of mongo beans and two cups of rice");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ qty: 1, unit: "bowl", name: "mongo beans" });
    expect(items[1]).toMatchObject({ qty: 2, unit: "cup", name: "rice" });
  });
});

describe("bundled foods", () => {
  it("finds Filipino staples by their common spellings", () => {
    expect(findBundledFood("mongo beans")?.key).toBe("munggo");
    expect(findBundledFood("monggo")?.key).toBe("munggo");
    expect(findBundledFood("kanin")?.key).toBe("rice");
    expect(findBundledFood("pandesal")?.key).toBe("pandesal");
  });

  it("falls back to the longest contained alias", () => {
    expect(findBundledFood("grilled chicken breast")?.key).toBe("chicken-breast");
  });

  it("returns nothing for food it doesn't know", () => {
    expect(findBundledFood("xyzzy stew")).toBeUndefined();
    expect(findBundledFood("")).toBeUndefined();
  });

  it("picks the portion matching the stated unit", () => {
    const rice = findBundledFood("rice")!;
    expect(pickPortion(rice, "cup").kcal).toBe(205);
    expect(pickPortion(rice, "bowl").kcal).toBe(280);
    // Unknown unit falls back to the food's default portion.
    expect(pickPortion(rice, "wheelbarrow").kcal).toBe(205);
  });

  it("works out a real meal", () => {
    const items = parseMeal("a bowl of mongo beans and two cups of rice");
    const total = items.reduce(
      (acc, i) => {
        const food = findBundledFood(i.name);
        if (!food) return acc;
        const p = pickPortion(food, i.unit);
        return { kcal: acc.kcal + p.kcal * i.qty, protein: acc.protein + p.protein * i.qty };
      },
      { kcal: 0, protein: 0 },
    );
    expect(Math.round(total.kcal)).toBe(622); // 212 + 2*205
    expect(Math.round(total.protein * 10) / 10).toBe(22.6); // 14 + 2*4.3
  });
});

describe("label OCR", () => {
  it("reads a clean label", () => {
    const r = readLabel(`Nutrition Facts
      Serving size 30g
      Servings per container 3
      Calories 150
      Total Fat 8g
      Protein 2g`);
    expect(r).toMatchObject({ servings: 3, kcal: 150, protein: 2 });
    expect(wholePack(r)).toEqual({ kcal: 450, protein: 6 });
  });

  it("survives the usual OCR mangling of digits", () => {
    // O read for 0, l read for 1.
    const r = readLabel("Servings per container 3 Calories l5O Protein 2g");
    expect(r.kcal).toBe(150);
    expect(r.servings).toBe(3);
  });

  it("copes with the other common phrasing", () => {
    const r = readLabel("About 2 servings per pack. Energy 220 kcal. Protein: 5.5 g");
    expect(r).toMatchObject({ servings: 2, kcal: 220, protein: 5.5 });
  });

  it("returns nulls rather than guesses when the text is unreadable", () => {
    const r = readLabel("hopeless smudge");
    expect(r).toMatchObject({ servings: null, kcal: null, protein: null });
    expect(wholePack(r)).toEqual({ kcal: null, protein: null });
  });

  it("treats a pack with no stated servings as one serving", () => {
    const r = readLabel("Calories 150 Protein 2g");
    expect(wholePack(r)).toEqual({ kcal: 150, protein: 2 });
  });
});
