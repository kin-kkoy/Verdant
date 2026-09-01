/**
 * The bundled food table — the offline floor of the lookup cascade.
 *
 *   your saved foods  ->  THIS TABLE  ->  Open Food Facts
 *
 * Weighted towards what the people using this app actually eat (Filipino staples
 * first), because a US-centric database can't find munggo or pandesal. Every
 * number is a public-data estimate for a typical portion, not a measurement —
 * the UI says so, and every value stays editable before it's saved.
 *
 * Adding a food here is cheap; if something is missing, a user logging it once
 * saves it to their own foods and never needs this table for it again.
 */

export type Portion = {
  /** Canonical unit from parse.ts, or "serving" as the catch-all. */
  unit: string;
  kcal: number;
  protein: number;
};

export type BundledFood = {
  key: string;
  name: string;
  /** Other spellings people actually type. Matched exactly after normalising. */
  aliases: string[];
  portions: Portion[];
};

export const BUNDLED_FOODS: BundledFood[] = [
  // --- rice, grains, bread ---
  { key: "rice", name: "White rice, cooked", aliases: ["rice", "kanin", "white rice", "steamed rice"],
    portions: [{ unit: "cup", kcal: 205, protein: 4.3 }, { unit: "bowl", kcal: 280, protein: 5.9 }, { unit: "g", kcal: 1.3, protein: 0.027 }] },
  { key: "brown-rice", name: "Brown rice, cooked", aliases: ["brown rice"],
    portions: [{ unit: "cup", kcal: 216, protein: 5 }, { unit: "g", kcal: 1.1, protein: 0.026 }] },
  { key: "garlic-rice", name: "Garlic fried rice", aliases: ["garlic rice", "sinangag"],
    portions: [{ unit: "cup", kcal: 300, protein: 5 }] },
  { key: "pandesal", name: "Pandesal", aliases: ["pandesal", "pan de sal"],
    portions: [{ unit: "piece", kcal: 105, protein: 3 }] },
  { key: "bread", name: "White bread", aliases: ["bread", "tasty", "loaf bread"],
    portions: [{ unit: "slice", kcal: 75, protein: 2.6 }] },
  { key: "oats", name: "Oatmeal, cooked", aliases: ["oats", "oatmeal", "rolled oats"],
    portions: [{ unit: "cup", kcal: 160, protein: 6 }] },

  // --- beans, legumes ---
  { key: "munggo", name: "Munggo (mung bean stew)", aliases: ["munggo", "mongo", "mung beans", "mongo beans", "mung bean", "monggo"],
    portions: [{ unit: "bowl", kcal: 212, protein: 14 }, { unit: "cup", kcal: 190, protein: 12.6 }] },
  { key: "beans", name: "Beans, cooked", aliases: ["beans", "kidney beans", "black beans"],
    portions: [{ unit: "cup", kcal: 225, protein: 15 }] },
  { key: "tofu", name: "Tofu", aliases: ["tofu", "tokwa"],
    portions: [{ unit: "piece", kcal: 90, protein: 9 }, { unit: "g", kcal: 0.76, protein: 0.08 }] },

  // --- eggs, dairy ---
  { key: "egg", name: "Egg", aliases: ["egg", "eggs", "itlog", "boiled egg", "fried egg", "scrambled egg", "scrambled eggs"],
    portions: [{ unit: "piece", kcal: 78, protein: 6.3 }] },
  { key: "milk", name: "Milk", aliases: ["milk", "gatas", "fresh milk"],
    portions: [{ unit: "cup", kcal: 149, protein: 8 }, { unit: "glass", kcal: 149, protein: 8 }, { unit: "ml", kcal: 0.62, protein: 0.033 }] },
  { key: "cheese", name: "Cheese", aliases: ["cheese", "keso", "cheddar"],
    portions: [{ unit: "slice", kcal: 70, protein: 4 }, { unit: "g", kcal: 4, protein: 0.25 }] },
  { key: "yogurt", name: "Yogurt", aliases: ["yogurt", "yoghurt", "greek yogurt"],
    portions: [{ unit: "cup", kcal: 150, protein: 12 }] },

  // --- chicken, pork, beef ---
  { key: "chicken-breast", name: "Chicken breast, cooked", aliases: ["chicken breast", "chicken", "manok", "grilled chicken"],
    portions: [{ unit: "piece", kcal: 165, protein: 31 }, { unit: "g", kcal: 1.65, protein: 0.31 }] },
  { key: "fried-chicken", name: "Fried chicken", aliases: ["fried chicken", "chicken joy"],
    portions: [{ unit: "piece", kcal: 290, protein: 21 }] },
  { key: "adobo", name: "Chicken adobo", aliases: ["adobo", "chicken adobo", "pork adobo"],
    portions: [{ unit: "cup", kcal: 375, protein: 27 }, { unit: "serving", kcal: 375, protein: 27 }] },
  { key: "pork", name: "Pork, cooked", aliases: ["pork", "baboy", "pork belly", "liempo"],
    portions: [{ unit: "g", kcal: 2.4, protein: 0.27 }, { unit: "serving", kcal: 290, protein: 25 }] },
  { key: "lechon-kawali", name: "Lechon kawali", aliases: ["lechon kawali", "lechon", "crispy pata", "bagnet"],
    portions: [{ unit: "serving", kcal: 450, protein: 24 }] },
  { key: "sisig", name: "Sisig", aliases: ["sisig"],
    portions: [{ unit: "serving", kcal: 410, protein: 22 }] },
  { key: "tapa", name: "Beef tapa", aliases: ["tapa", "beef tapa", "tapsilog"],
    portions: [{ unit: "serving", kcal: 320, protein: 28 }] },
  { key: "beef", name: "Beef, cooked", aliases: ["beef", "baka", "steak"],
    portions: [{ unit: "g", kcal: 2.5, protein: 0.26 }, { unit: "serving", kcal: 280, protein: 26 }] },
  { key: "tocino", name: "Tocino", aliases: ["tocino"],
    portions: [{ unit: "serving", kcal: 290, protein: 18 }] },
  { key: "longganisa", name: "Longganisa", aliases: ["longganisa", "longanisa"],
    portions: [{ unit: "piece", kcal: 150, protein: 7 }] },
  { key: "hotdog", name: "Hotdog", aliases: ["hotdog", "hot dog"],
    portions: [{ unit: "piece", kcal: 150, protein: 5 }] },
  { key: "spam", name: "Luncheon meat", aliases: ["spam", "luncheon meat", "ma-ling"],
    portions: [{ unit: "slice", kcal: 90, protein: 4.5 }] },

  // --- fish & seafood ---
  { key: "fish", name: "Fish, cooked", aliases: ["fish", "isda", "tilapia", "bangus", "milkfish"],
    portions: [{ unit: "piece", kcal: 180, protein: 26 }, { unit: "g", kcal: 1.5, protein: 0.22 }] },
  { key: "tuna", name: "Canned tuna", aliases: ["tuna", "canned tuna"],
    portions: [{ unit: "can", kcal: 190, protein: 33 }, { unit: "g", kcal: 1.3, protein: 0.24 }] },
  { key: "sardines", name: "Sardines", aliases: ["sardines", "sardinas"],
    portions: [{ unit: "can", kcal: 200, protein: 21 }] },
  { key: "shrimp", name: "Shrimp", aliases: ["shrimp", "hipon", "prawns"],
    portions: [{ unit: "g", kcal: 1, protein: 0.24 }, { unit: "serving", kcal: 145, protein: 28 }] },
  { key: "daing", name: "Dried fish (daing/tuyo)", aliases: ["daing", "tuyo", "dried fish"],
    portions: [{ unit: "piece", kcal: 120, protein: 18 }] },

  // --- Filipino dishes ---
  { key: "sinigang", name: "Sinigang", aliases: ["sinigang"],
    portions: [{ unit: "bowl", kcal: 230, protein: 18 }, { unit: "serving", kcal: 230, protein: 18 }] },
  { key: "tinola", name: "Tinola", aliases: ["tinola", "chicken tinola"],
    portions: [{ unit: "bowl", kcal: 210, protein: 20 }] },
  { key: "nilaga", name: "Nilaga", aliases: ["nilaga", "bulalo"],
    portions: [{ unit: "bowl", kcal: 300, protein: 22 }] },
  { key: "kare-kare", name: "Kare-kare", aliases: ["kare kare", "karekare"],
    portions: [{ unit: "serving", kcal: 400, protein: 20 }] },
  { key: "menudo", name: "Menudo / afritada / caldereta", aliases: ["menudo", "afritada", "caldereta", "kaldereta", "mechado"],
    portions: [{ unit: "serving", kcal: 350, protein: 20 }] },
  { key: "pancit", name: "Pancit", aliases: ["pancit", "pansit", "bihon", "canton", "pancit canton"],
    portions: [{ unit: "cup", kcal: 290, protein: 10 }, { unit: "serving", kcal: 290, protein: 10 }] },
  { key: "lumpia", name: "Lumpia", aliases: ["lumpia", "spring roll", "spring rolls", "shanghai"],
    portions: [{ unit: "piece", kcal: 65, protein: 3 }] },
  { key: "ginataan-gulay", name: "Vegetables in coconut milk", aliases: ["ginataang gulay", "laing", "bicol express"],
    portions: [{ unit: "serving", kcal: 260, protein: 8 }] },
  { key: "chopsuey", name: "Chopsuey", aliases: ["chopsuey", "chop suey"],
    portions: [{ unit: "cup", kcal: 150, protein: 9 }] },

  // --- noodles & fast food ---
  { key: "instant-noodles", name: "Instant noodles", aliases: ["instant noodles", "noodles", "pancit canton instant", "lucky me", "ramen"],
    portions: [{ unit: "pack", kcal: 380, protein: 8 }, { unit: "serving", kcal: 380, protein: 8 }] },
  { key: "spaghetti", name: "Spaghetti", aliases: ["spaghetti", "pasta"],
    portions: [{ unit: "cup", kcal: 300, protein: 11 }] },
  { key: "burger", name: "Burger", aliases: ["burger", "hamburger", "cheeseburger"],
    portions: [{ unit: "piece", kcal: 300, protein: 15 }] },
  { key: "pizza", name: "Pizza", aliases: ["pizza"],
    portions: [{ unit: "slice", kcal: 285, protein: 12 }] },
  { key: "fries", name: "French fries", aliases: ["fries", "french fries"],
    portions: [{ unit: "serving", kcal: 320, protein: 4 }] },
  { key: "siomai", name: "Siomai", aliases: ["siomai", "shumai", "dumpling", "dumplings"],
    portions: [{ unit: "piece", kcal: 45, protein: 2.5 }] },

  // --- vegetables ---
  { key: "vegetables", name: "Mixed vegetables", aliases: ["vegetables", "gulay", "veggies", "salad"],
    portions: [{ unit: "cup", kcal: 60, protein: 3 }, { unit: "serving", kcal: 60, protein: 3 }] },
  { key: "kangkong", name: "Kangkong", aliases: ["kangkong", "water spinach"],
    portions: [{ unit: "cup", kcal: 25, protein: 2.6 }] },
  { key: "malunggay", name: "Malunggay", aliases: ["malunggay", "moringa"],
    portions: [{ unit: "cup", kcal: 40, protein: 4 }] },
  { key: "potato", name: "Potato", aliases: ["potato", "potatoes", "patatas"],
    portions: [{ unit: "piece", kcal: 160, protein: 4.3 }] },
  { key: "corn", name: "Corn", aliases: ["corn", "mais"],
    portions: [{ unit: "piece", kcal: 90, protein: 3.3 }, { unit: "cup", kcal: 130, protein: 5 }] },

  // --- fruit ---
  { key: "banana", name: "Banana", aliases: ["banana", "saging", "bananas"],
    portions: [{ unit: "piece", kcal: 105, protein: 1.3 }] },
  { key: "mango", name: "Mango", aliases: ["mango", "mangga"],
    portions: [{ unit: "piece", kcal: 150, protein: 2 }] },
  { key: "apple", name: "Apple", aliases: ["apple", "mansanas"],
    portions: [{ unit: "piece", kcal: 95, protein: 0.5 }] },
  { key: "orange", name: "Orange", aliases: ["orange", "dalandan"],
    portions: [{ unit: "piece", kcal: 62, protein: 1.2 }] },
  { key: "papaya", name: "Papaya", aliases: ["papaya"],
    portions: [{ unit: "cup", kcal: 55, protein: 0.9 }] },
  { key: "watermelon", name: "Watermelon", aliases: ["watermelon", "pakwan"],
    portions: [{ unit: "cup", kcal: 46, protein: 0.9 }] },

  // --- drinks ---
  { key: "coffee", name: "Coffee, black", aliases: ["coffee", "kape", "americano", "black coffee"],
    portions: [{ unit: "cup", kcal: 5, protein: 0.3 }, { unit: "glass", kcal: 5, protein: 0.3 }] },
  { key: "coffee-milk", name: "Coffee with milk and sugar", aliases: ["3in1", "3 in 1", "kopiko", "latte", "milk coffee"],
    portions: [{ unit: "cup", kcal: 110, protein: 2 }, { unit: "pack", kcal: 110, protein: 2 }] },
  { key: "soda", name: "Soft drink", aliases: ["soda", "coke", "softdrink", "soft drink", "pepsi", "sprite"],
    portions: [{ unit: "can", kcal: 140, protein: 0 }, { unit: "glass", kcal: 100, protein: 0 }, { unit: "bottle", kcal: 210, protein: 0 }] },
  { key: "juice", name: "Fruit juice", aliases: ["juice", "orange juice", "apple juice"],
    portions: [{ unit: "glass", kcal: 110, protein: 0.7 }, { unit: "cup", kcal: 110, protein: 0.7 }] },
  { key: "beer", name: "Beer", aliases: ["beer", "san mig", "red horse"],
    portions: [{ unit: "bottle", kcal: 150, protein: 1.6 }, { unit: "can", kcal: 150, protein: 1.6 }] },
  { key: "protein-shake", name: "Protein shake", aliases: ["protein shake", "whey", "protein powder"],
    portions: [{ unit: "serving", kcal: 120, protein: 24 }, { unit: "glass", kcal: 120, protein: 24 }] },
  { key: "water", name: "Water", aliases: ["water", "tubig"],
    portions: [{ unit: "glass", kcal: 0, protein: 0 }, { unit: "l", kcal: 0, protein: 0 }] },

  // --- snacks & sweets ---
  { key: "chips", name: "Potato chips", aliases: ["chips", "potato chips", "piattos", "nova", "chippy"],
    portions: [{ unit: "pack", kcal: 160, protein: 2 }, { unit: "serving", kcal: 160, protein: 2 }] },
  { key: "biscuits", name: "Biscuits / crackers", aliases: ["biscuits", "crackers", "skyflakes", "biscuit", "cookies", "cookie"],
    portions: [{ unit: "pack", kcal: 130, protein: 2.5 }, { unit: "piece", kcal: 45, protein: 0.8 }] },
  { key: "chocolate", name: "Chocolate bar", aliases: ["chocolate", "chocolate bar", "candy"],
    portions: [{ unit: "piece", kcal: 230, protein: 3 }, { unit: "pack", kcal: 230, protein: 3 }] },
  { key: "ice-cream", name: "Ice cream", aliases: ["ice cream", "icecream", "sorbetes"],
    portions: [{ unit: "cup", kcal: 270, protein: 4.6 }, { unit: "serving", kcal: 270, protein: 4.6 }] },
  { key: "peanuts", name: "Peanuts", aliases: ["peanuts", "mani", "nuts"],
    portions: [{ unit: "cup", kcal: 830, protein: 38 }, { unit: "pack", kcal: 170, protein: 7 }] },
  { key: "halo-halo", name: "Halo-halo", aliases: ["halo halo", "halohalo"],
    portions: [{ unit: "serving", kcal: 330, protein: 6 }] },
  { key: "taho", name: "Taho", aliases: ["taho"],
    portions: [{ unit: "cup", kcal: 140, protein: 6 }] },

  // --- fats & extras ---
  { key: "oil", name: "Cooking oil", aliases: ["oil", "cooking oil", "olive oil"],
    portions: [{ unit: "tbsp", kcal: 120, protein: 0 }] },
  { key: "butter", name: "Butter", aliases: ["butter", "margarine"],
    portions: [{ unit: "tbsp", kcal: 102, protein: 0.1 }] },
  { key: "peanut-butter", name: "Peanut butter", aliases: ["peanut butter"],
    portions: [{ unit: "tbsp", kcal: 95, protein: 4 }] },
  { key: "sugar", name: "Sugar", aliases: ["sugar", "asukal"],
    portions: [{ unit: "tsp", kcal: 16, protein: 0 }, { unit: "tbsp", kcal: 48, protein: 0 }] },
  { key: "mayonnaise", name: "Mayonnaise", aliases: ["mayo", "mayonnaise"],
    portions: [{ unit: "tbsp", kcal: 90, protein: 0.1 }] },
];

/** Normalise a name for matching: lower-case, no punctuation, single spaces. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const INDEX = new Map<string, BundledFood>();
for (const f of BUNDLED_FOODS) {
  for (const a of [f.name, ...f.aliases]) INDEX.set(normalise(a), f);
}

/**
 * Find a bundled food. Exact alias first, then the longest alias contained in
 * the text — so "grilled chicken breast" still lands on chicken breast.
 */
export function findBundledFood(name: string): BundledFood | undefined {
  const n = normalise(name);
  if (!n) return undefined;
  const exact = INDEX.get(n);
  if (exact) return exact;

  let best: { food: BundledFood; len: number } | undefined;
  for (const [alias, food] of INDEX) {
    if (alias.length < 3) continue;
    if (n.includes(alias) && (!best || alias.length > best.len)) best = { food, len: alias.length };
  }
  return best?.food;
}

/** Pick the portion matching a unit, else the food's default (first) portion. */
export function pickPortion(food: BundledFood, unit: string | null): Portion {
  if (unit) {
    const exact = food.portions.find((p) => p.unit === unit);
    if (exact) return exact;
  }
  return food.portions[0];
}
