/**
 * Read a nutrition label out of OCR text.
 *
 * Tesseract gives us a noisy transcript of a photo, so this is regex over
 * keywords rather than layout parsing. It is expected to miss sometimes — every
 * number it finds is shown to the user pre-filled and editable before anything
 * is saved. Never write a parse straight through.
 *
 * Pure and unit-tested.
 */

export type LabelReading = {
  /** Servings in the whole pack, if the label says. */
  servings: number | null;
  /** Per one serving. */
  kcal: number | null;
  protein: number | null;
  /** e.g. "30g" — shown back so the user can sanity-check what was read. */
  servingSize: string | null;
};

/** OCR habitually reads O as 0 and l/I as 1 inside numbers. */
function digits(s: string): string {
  return s.replace(/[OoQ]/g, "0").replace(/[lI|]/g, "1").replace(/[Ss]/g, "5");
}

function num(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(digits(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Pull servings / calories / protein out of an OCR transcript.
 * Tolerant of line breaks, colons, and the usual OCR mangling.
 */
export function readLabel(text: string): LabelReading {
  const t = text.replace(/\s+/g, " ");

  // "Servings per container 3", "about 3 servings per pack", "3 servings per container"
  const servings =
    num(t.match(/servings?\s*(?:per|\/)\s*(?:container|pack|package|bag)?\s*:?\s*(?:about\s*)?([\d.OoQlI|]+)/i)?.[1]) ??
    num(t.match(/(?:about\s*)?([\d.OoQlI|]+)\s*servings?\s*(?:per|\/|in)\b/i)?.[1]);

  // "Calories 150", "Energy 150 kcal", "Calories per serving: 150"
  const kcal =
    num(t.match(/calories\s*(?:per\s*serving)?\s*:?\s*([\d.OoQlI|]+)/i)?.[1]) ??
    num(t.match(/energy\s*:?\s*([\d.OoQlI|]+)\s*k?cal/i)?.[1]);

  // "Protein 2g", "Protein: 2.5 g", "Total Protein 2g"
  const protein = num(
    t.match(/protein\s*:?\s*([\d.OoQlI|]+)\s*g?/i)?.[1],
  );

  const servingSize =
    t.match(/serving\s*size\s*:?\s*([^\s].{0,24}?)(?=\s*(?:servings?|calories|amount|per|$))/i)?.[1]?.trim() ??
    null;

  return {
    servings: servings && servings > 0 && servings < 100 ? servings : null,
    kcal: kcal != null && kcal < 5000 ? kcal : null,
    protein: protein != null && protein < 500 ? protein : null,
    servingSize: servingSize || null,
  };
}

/** What the whole pack comes to, when you ate all of it. */
export function wholePack(r: LabelReading): { kcal: number | null; protein: number | null } {
  const n = r.servings ?? 1;
  return {
    kcal: r.kcal == null ? null : Math.round(r.kcal * n),
    protein: r.protein == null ? null : Math.round(r.protein * n * 10) / 10,
  };
}
