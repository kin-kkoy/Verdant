/**
 * Turn "a bowl of munggo and two cups of rice" into countable items.
 *
 * Pure and unit-tested. Deliberately forgiving rather than clever: it splits on
 * the obvious separators, pulls a leading quantity and unit if they're there, and
 * hands the rest over as the food name for lookup. Anything it can't read becomes
 * a quantity of 1, which the user can correct — the parse is a suggestion, never
 * a silent write.
 */

export type ParsedItem = {
  /** How many. Defaults to 1 when nothing is stated. */
  qty: number;
  /** Normalised unit ("cup", "bowl", "g", …) or null for a bare count. */
  unit: string | null;
  /** The food, lower-cased and trimmed. */
  name: string;
  /** The original chunk, kept so the UI can show what it read. */
  raw: string;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, "1/2": 0.5, "1/4": 0.25, "3/4": 0.75,
};

/** Unit spellings we recognise, mapped to a canonical form. */
const UNIT_ALIASES: Record<string, string> = {
  cup: "cup", cups: "cup",
  bowl: "bowl", bowls: "bowl",
  plate: "plate", plates: "plate",
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece",
  slice: "slice", slices: "slice",
  serving: "serving", servings: "serving",
  scoop: "serving", scoops: "serving",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilo: "kg", kilos: "kg",
  ml: "ml", l: "l", liter: "l", litre: "l", liters: "l", litres: "l",
  glass: "glass", glasses: "glass",
  can: "can", cans: "can",
  bottle: "bottle", bottles: "bottle",
  pack: "pack", packs: "pack", bag: "pack", bags: "pack",
  stick: "stick", sticks: "stick",
  cluster: "piece", clusters: "piece",
};

/** Words that carry no meaning for lookup. */
const NOISE = new Set(["of", "the", "some", "with", "and", "plus", "my", "small", "large", "big"]);

function toNumber(token: string): number | null {
  const word = NUMBER_WORDS[token];
  if (word != null) return word;
  // "1.5", "2", "1/2"
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split("/").map(Number);
    return b ? a / b : null;
  }
  const n = Number(token);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Split a free-text meal into its separate foods. */
export function splitItems(text: string): string[] {
  return text
    .replace(/\band\b/gi, ",")
    .replace(/[+;\n]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Read one chunk like "2 cups of rice" or "3 eggs". */
export function parseItem(chunk: string): ParsedItem {
  const raw = chunk.trim();
  // "300g chicken" — a number glued to a unit.
  const glued = raw.match(/^([\d.]+)\s*(g|kg|ml|l)\b\s*(.*)$/i);
  if (glued) {
    return {
      qty: Number(glued[1]) || 1,
      unit: UNIT_ALIASES[glued[2].toLowerCase()] ?? null,
      name: cleanName(glued[3]),
      raw,
    };
  }

  const tokens = raw.split(/\s+/);
  let i = 0;
  let qty = 1;

  const asNumber = toNumber(tokens[0]?.toLowerCase() ?? "");
  if (asNumber != null) {
    qty = asNumber;
    i = 1;
    // "one and a half cups" is beyond us; "1 1/2" is not.
    const second = toNumber(tokens[1]?.toLowerCase() ?? "");
    if (second != null && second < 1) {
      qty += second;
      i = 2;
    }
  }

  let unit: string | null = null;
  const maybeUnit = tokens[i]?.toLowerCase().replace(/[.,]/g, "");
  if (maybeUnit && UNIT_ALIASES[maybeUnit]) {
    unit = UNIT_ALIASES[maybeUnit];
    i += 1;
  }

  return { qty, unit, name: cleanName(tokens.slice(i).join(" ")), raw };
}

function cleanName(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w))
    .join(" ")
    .replace(/[.,!?]+$/, "")
    .trim();
}

/** Parse a whole meal description. */
export function parseMeal(text: string): ParsedItem[] {
  return splitItems(text)
    .map(parseItem)
    .filter((i) => i.name.length > 0);
}
