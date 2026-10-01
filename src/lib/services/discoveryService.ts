import { Product, Shop } from "@/types";
import Fuse from "fuse.js";

// Extracted product + shop pair used in discovery views
export interface ProductPair {
  product: Product;
  shop: Shop;
  stockQty: number;
}

// Comprehensive bidirectional Swahili <-> English synonym dictionary
// Covers common product and shop categories for a Tanzanian marketplace.
const SYNONYMS: Record<string, string[]> = {
  // ── Electronics / Simu & Teknolojia ──────────────────────────────────────
  "simu": ["phone", "smartphone", "mobile", "cellphone", "handset", "rununu"],
  "rununu": ["simu", "phone", "smartphone", "mobile"],
  "phone": ["simu", "rununu", "smartphone", "mobile", "cellphone", "handset"],
  "smartphone": ["simu", "rununu", "phone", "mobile"],
  "mobile": ["simu", "rununu", "phone", "smartphone"],

  "kompyuta": ["computer", "pc", "laptop", "desktop", "notebook"],
  "laptop": ["kompyuta", "computer", "notebook", "pc"],
  "computer": ["kompyuta", "laptop", "pc", "desktop", "notebook"],
  "pc": ["kompyuta", "computer", "laptop", "desktop"],
  "notebook": ["laptop", "kompyuta", "computer"],

  "tv": ["televisheni", "television", "screen", "oled", "smart tv", "runinga"],
  "televisheni": ["tv", "television", "runinga", "screen", "smart tv"],
  "runinga": ["tv", "televisheni", "television"],
  "television": ["tv", "televisheni", "runinga", "screen"],

  "charger": ["chaja", "adapter", "cable", "kebo"],
  "chaja": ["charger", "adapter", "cable"],
  "earphone": ["headphone", "earbuds", "headset", "vipokea sauti"],
  "headphone": ["earphone", "earbuds", "headset", "vipokea sauti"],
  "vipokea sauti": ["headphone", "earphone", "earbuds"],
  "betri": ["battery", "power bank"],
  "battery": ["betri", "power bank"],
  "power bank": ["betri", "battery", "chaja ya akiba"],
  "kamera": ["camera", "picha"],
  "camera": ["kamera", "picha"],
  "printer": ["printa", "chapisha"],
  "printa": ["printer"],

  // ── Clothing / Mavazi & Nguo ──────────────────────────────────────────────
  "nguo": ["clothes", "clothing", "apparel", "garments", "mavazi", "outfit", "dress"],
  "mavazi": ["nguo", "clothes", "clothing", "apparel", "garments"],
  "clothes": ["nguo", "mavazi", "clothing", "apparel", "garments"],
  "clothing": ["nguo", "mavazi", "clothes", "apparel"],
  "dress": ["nguo ya msichana", "gauni", "skirt"],
  "gauni": ["dress", "gown", "skirt"],
  "shati": ["shirt", "blouse", "top"],
  "shirt": ["shati", "blouse", "top", "t-shirt"],
  "suruali": ["trousers", "pants", "jeans", "shorts"],
  "trousers": ["suruali", "pants", "jeans"],
  "pants": ["suruali", "trousers", "jeans"],
  "jeans": ["suruali", "denim", "pants"],
  "kanga": ["leso", "wrap", "fabric", "kitenge"],
  "kitenge": ["kanga", "leso", "fabric", "ankara"],
  "leso": ["kanga", "kitenge", "scarf", "fabric"],
  "kofia": ["hat", "cap", "headwear"],
  "hat": ["kofia", "cap"],
  "cap": ["kofia", "hat"],
  "mfuko": ["bag", "handbag", "purse", "backpack"],
  "bag": ["mfuko", "handbag", "purse", "backpack", "mkoba"],
  "mkoba": ["bag", "mfuko", "handbag", "wallet", "purse"],
  "soksi": ["socks", "stockings"],
  "socks": ["soksi", "stockings"],
  "chupi": ["underwear", "inner wear", "boxers"],
  "underwear": ["chupi", "inner wear"],

  // ── Footwear / Viatu ──────────────────────────────────────────────────────
  "viatu": ["shoes", "footwear", "sneakers", "sandals", "boots", "slippers"],
  "shoes": ["viatu", "footwear", "sneakers", "boots"],
  "sneakers": ["viatu", "shoes", "sports shoes", "trainers"],
  "sandals": ["viatu", "slippers", "ndala"],
  "ndala": ["sandals", "slippers", "viatu"],
  "boots": ["viatu", "shoes", "buti"],
  "buti": ["boots", "shoes", "viatu"],

  // ── Food & Groceries / Chakula & Vitu vya Nyumba ─────────────────────────
  "chakula": ["food", "groceries", "vyakula", "kula", "meals"],
  "food": ["chakula", "vyakula", "groceries", "meals"],
  "groceries": ["chakula", "vyakula", "food", "provisions", "mahitaji"],
  "vyakula": ["chakula", "food", "groceries"],
  "unga": ["flour", "maize flour", "wheat flour"],
  "flour": ["unga"],
  "mchele": ["rice"],
  "rice": ["mchele"],
  "sukari": ["sugar"],
  "sugar": ["sukari"],
  "mafuta": ["oil", "cooking oil", "fat"],
  "oil": ["mafuta", "cooking oil"],
  "chumvi": ["salt"],
  "salt": ["chumvi"],
  "maziwa": ["milk", "dairy"],
  "milk": ["maziwa", "dairy"],
  "nyama": ["meat", "beef", "chicken", "pork"],
  "meat": ["nyama", "beef", "chicken"],
  "samaki": ["fish", "seafood"],
  "fish": ["samaki", "seafood"],
  "mboga": ["vegetables", "greens", "veggies"],
  "vegetables": ["mboga", "greens", "veggies"],
  "matunda": ["fruits", "fruit"],
  "fruits": ["matunda", "fruit"],

  // ── Beauty & Personal Care / Urembo & Usafi ───────────────────────────────
  "sabuni": ["soap", "detergent", "cleanser"],
  "soap": ["sabuni", "cleanser"],
  "urembo": ["beauty", "cosmetics", "makeup", "skincare"],
  "beauty": ["urembo", "cosmetics", "makeup", "skincare"],
  "cosmetics": ["urembo", "beauty", "makeup"],
  "makeup": ["urembo", "beauty", "cosmetics"],
  "mzigo wa nywele": ["hair products", "shampoo", "conditioner"],
  "nywele": ["hair", "weave", "braids", "wigs"],
  "hair": ["nywele", "weave", "braids", "wigs", "hair products"],
  "weave": ["nywele", "hair", "wigs", "extensions"],
  "manukato": ["perfume", "cologne", "fragrance", "deodorant"],
  "perfume": ["manukato", "cologne", "fragrance", "deodorant"],
  "cologne": ["manukato", "perfume", "fragrance"],
  "cream": ["krimu", "lotion", "moisturizer"],
  "krimu": ["cream", "lotion", "moisturizer"],
  "lotion": ["krimu", "cream", "moisturizer", "body lotion"],

  // ── Home & Living / Nyumbani ──────────────────────────────────────────────
  "samani": ["furniture", "sofa", "kitanda", "meza", "kiti"],
  "furniture": ["samani", "sofa", "kitanda", "meza", "kiti"],
  "kitanda": ["bed", "furniture", "samani"],
  "bed": ["kitanda", "furniture", "samani"],
  "shuka": ["bedsheet", "bedsheets", "linen", "blanket"],
  "bedsheet": ["shuka", "linen"],
  "godoro": ["mattress", "matress", "bed"],
  "mattress": ["godoro", "bed"],
  "matress": ["godoro", "bed"],
  "table": ["meza", "desk"],
  "meza": ["table", "desk"],
  "kiti": ["chair", "stool", "seat"],
  "chair": ["kiti", "stool", "seat"],
  "jiko": ["cooker", "stove", "oven", "grill"],
  "cooker": ["jiko", "stove", "oven", "grill"],
  "stove": ["jiko", "cooker", "grill"],
  "sufuria": ["pot", "pan", "cookware", "saucepan"],
  "pot": ["sufuria", "pan", "cookware"],
  "pan": ["sufuria", "pot", "frying pan"],
  "vyombo": ["utensils", "kitchenware", "dishes", "plates"],
  "utensils": ["vyombo", "kitchenware"],
  "friji": ["fridge", "refrigerator", "freezer"],
  "fridge": ["friji", "refrigerator", "freezer"],
  "refrigerator": ["friji", "fridge", "freezer"],
  "mashine ya kuosha": ["washing machine", "washer", "laundry machine"],
  "washing machine": ["mashine ya kuosha", "washer"],
  "blanket": ["blanketi", "comforter", "duvet", "shuka"],
  "blanketi": ["blanket", "comforter", "duvet"],

  // ── Health & Medicine / Afya & Dawa ──────────────────────────────────────
  "dawa": ["medicine", "drugs", "medication", "pharmacy"],
  "medicine": ["dawa", "medication", "drugs"],
  "afya": ["health", "wellness", "medical"],
  "health": ["afya", "wellness", "medical"],

  // ── Vehicles & Transport / Magari & Usafiri ──────────────────────────────
  "gari": ["car", "vehicle", "auto", "automobile"],
  "car": ["gari", "vehicle", "auto"],
  "vehicle": ["gari", "car", "auto"],
  "baiskeli": ["bicycle", "bike", "cycle"],
  "bicycle": ["baiskeli", "bike", "cycle"],
  "pikipiki": ["motorcycle", "motorbike", "boda boda"],
  "motorcycle": ["pikipiki", "motorbike", "boda boda"],
  "boda boda": ["pikipiki", "motorcycle", "motorbike"],
  "spare parts": ["vipande", "spea", "auto parts"],
  "vipande": ["spare parts", "spea", "parts"],
  "spea": ["spare parts", "vipande"],

  // ── Sports & Fitness / Michezo ────────────────────────────────────────────
  "michezo": ["sports", "fitness", "gym", "exercise"],
  "sports": ["michezo", "fitness", "gym"],
  "fitness": ["michezo", "sports", "gym", "exercise"],
  "gym": ["fitness", "michezo", "exercise"],

  // ── Agriculture / Kilimo ─────────────────────────────────────────────────
  "kilimo": ["agriculture", "farming", "farm"],
  "agriculture": ["kilimo", "farming", "farm"],
  "mbegu": ["seeds", "seedlings"],
  "seeds": ["mbegu"],
  "mbolea": ["fertilizer", "compost"],
  "fertilizer": ["mbolea", "compost"],

  // ── General / Jumla ──────────────────────────────────────────────────────
  "duka": ["shop", "store", "vendor"],
  "shop": ["duka", "store", "vendor"],
  "store": ["duka", "shop", "vendor"],
  "bei": ["price", "cost", "value"],
  "price": ["bei", "cost"],
  "mpya": ["new", "fresh", "latest"],
  "new": ["mpya", "fresh", "latest", "brand new"],
  "ya watoto": ["kids", "children", "baby", "infants"],
  "kids": ["ya watoto", "children", "baby"],
  "children": ["ya watoto", "kids", "baby"],
  "baby": ["ya watoto", "kids", "infant", "mtoto"],
  "mtoto": ["baby", "child", "infant", "kids"],
};

// Expand a single term into itself + its synonyms
const expandTerm = (term: string): string[] => {
  const set = new Set<string>([term]);
  (SYNONYMS[term] || []).forEach((s) => set.add(s));
  return Array.from(set);
};

const normalizeSearchText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Words that carry no search signal (conversational filler in EN + SW). */
const NOISE_WORDS = new Set([
  "the", "a", "an", "of", "for", "and", "with", "in", "on", "to", "me", "i", "want", "need",
  "show", "give", "find", "buy", "please", "good", "best", "cheap", "some", "any",
  "na", "ya", "wa", "za", "la", "kwa", "nataka", "natafuta", "nipe", "naomba", "tafadhali",
]);

export interface SearchField {
  value: unknown;
  weight: number;
}

/** Deterministic weighted search shared by products, shops and suppliers. */
export const rankBySearch = <T>(items: T[], query: string, fields: (item: T) => SearchField[]): T[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  const terms = normalizedQuery.split(" ").filter((term) => term && !NOISE_WORDS.has(term));
  if (terms.length === 0) return items;

  const scoreItem = (item: T) => {
    const itemFields = fields(item).map(({ value, weight }) => ({ text: normalizeSearchText(value), weight }));
    let score = 0;
    let matchedTerms = 0;

    for (const term of terms) {
      const variants = expandTerm(term).map(normalizeSearchText);
      let best = 0;
      for (const { text, weight } of itemFields) {
        if (!text) continue;
        for (const variant of variants) {
          if (text === variant) best = Math.max(best, weight * 12);
          else if (text.startsWith(`${variant} `) || text.startsWith(variant)) best = Math.max(best, weight * 9);
          else if (new RegExp(`(^|\\s)${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)) best = Math.max(best, weight * 7);
          else if (text.includes(variant)) best = Math.max(best, weight * 4);
          else if (variant.length >= 4) {
            const fuzzy = new Fuse([text], { threshold: 0.26, ignoreLocation: true }).search(variant)[0];
            if (fuzzy) best = Math.max(best, weight * 1.5);
          }
        }
      }
      if (best > 0) {
        matchedTerms += 1;
        score += best;
      }
    }
    return matchedTerms === terms.length ? score + matchedTerms * 20 : 0;
  };

  return items
    .map((item, index) => ({ item, index, score: scoreItem(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
};

export const searchProducts = (
  pairs: ProductPair[],
  query: string,
  categoryId?: string
): ProductPair[] => {
  let results = pairs;

  if (categoryId) {
    results = results.filter(pair => {
      const cats = pair.product.categories || [pair.product.category];
      return cats.includes(categoryId);
    });
  }

  return rankBySearch(results, query, (pair) => [
    { value: pair.product.name, weight: 10 },
    { value: pair.product.brand, weight: 7 },
    { value: [pair.product.category, ...(pair.product.categories || [])].join(" "), weight: 6 },
    { value: pair.shop.name, weight: 5 },
    { value: pair.shop.location, weight: 3 },
    { value: pair.product.description, weight: 2 },
  ]);
};


// Generic ranking system for dynamic sections
export const rankProducts = (
  pairs: ProductPair[],
  strategy: "trending" | "new_arrivals" | "random" = "random"
): ProductPair[] => {
  // Deep copy so we don't mutate original array
  const list = [...pairs];
  
  switch (strategy) {
    case "trending":
      // For Phase 1, we mock "trending" using a mix of stock levels and price. 
      // High stock items are likely actively sold. This avoids pure random.
      return list.sort((a, b) => {
        const scoreA = (a.stockQty * 0.5) + (a.product.sellingPrice > 0 ? 10 : 0);
        const scoreB = (b.stockQty * 0.5) + (b.product.sellingPrice > 0 ? 10 : 0);
        return scoreB - scoreA;
      });
      
    case "new_arrivals":
      // Usually would be based on createdAt, but since we don't always have it,
      // we'll just reverse the list assuming newer items are appended last.
      return list.reverse();
      
    case "random":
    default:
      return list.sort(() => 0.5 - Math.random());
  }
};

/**
 * Lightweight text matcher used by non-product listings (e.g. wholesale suppliers).
 * Applies the same noise-word stripping and Swahili/English synonym expansion:
 * every meaningful term (or one of its synonyms) must appear in the haystack.
 */
export const matchesQuery = (haystack: string, query: string): boolean => {
  if (!query.trim()) return true;
  return rankBySearch([haystack], query, (value) => [{ value, weight: 1 }]).length > 0;
};
