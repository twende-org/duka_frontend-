/**
 * Units of measure the product form offers. Shared with the photo-scan review
 * table so both pickers stay in sync.
 */
export const UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "pack", "metre", "dozen", "pair", "set", "roll", "bag", "ctn"];

/** AI reads "pieces", "kilograms", "carton"… — map them onto the form's list. */
const UNIT_SYNONYMS: Record<string, string> = {
  pieces: "pcs",
  piece: "pcs",
  each: "pcs",
  item: "pcs",
  items: "pcs",
  units: "pcs",
  kilograms: "kg",
  kilogram: "kg",
  kilo: "kg",
  kilos: "kg",
  kgs: "kg",
  grams: "g",
  gram: "g",
  grammes: "g",
  liters: "litre",
  liter: "litre",
  litres: "litre",
  ltr: "litre",
  l: "litre",
  milliliters: "ml",
  milliliter: "ml",
  millilitres: "ml",
  millilitre: "ml",
  boxes: "box",
  bx: "box",
  packets: "pack",
  packet: "pack",
  packs: "pack",
  pkt: "pack",
  pkts: "pack",
  meters: "metre",
  meter: "metre",
  metres: "metre",
  m: "metre",
  dozens: "dozen",
  dz: "dozen",
  pairs: "pair",
  pr: "pair",
  sets: "set",
  rolls: "roll",
  bags: "bag",
  cartons: "ctn",
  carton: "ctn",
  ctns: "ctn",
  crt: "ctn",
};

/**
 * Maps a free-text unit (e.g. from an AI photo read) onto one of the form's
 * units. Exact match first, then a simple plural strip, then synonyms.
 * Returns undefined when nothing matches — the caller keeps its default.
 */
export function matchUnitByName(raw: string | undefined): string | undefined {
  const needle = (raw ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!needle) return undefined;
  if (UNITS.includes(needle)) return needle;
  const singular = needle.endsWith("s") && !needle.endsWith("ss") ? needle.slice(0, -1) : needle;
  if (UNITS.includes(singular)) return singular;
  return UNIT_SYNONYMS[needle] ?? UNIT_SYNONYMS[singular];
}
