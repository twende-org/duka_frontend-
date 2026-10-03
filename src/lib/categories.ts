export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

export const categoryTree: CategoryNode[] = [
  {
    id: "electronics",
    name: "Electronics & Technology",
    children: [
      { id: "phones", name: "Mobile Phones" },
      { id: "smartphones", name: "Smartphones" },
      { id: "tablets", name: "Tablets" },
      { id: "laptops", name: "Laptops" },
      { id: "desktops", name: "Desktop Computers" },
      { id: "computer-accessories", name: "Computer Accessories" },
      { id: "audio", name: "Audio Equipment" },
      { id: "tv", name: "Televisions" },
      { id: "cameras", name: "Cameras & Photography" },
      { id: "gaming", name: "Gaming Consoles & Accessories" },
      { id: "networking", name: "Networking Equipment" },
      { id: "wearables", name: "Smart Watches & Wearables" },
      { id: "power", name: "Chargers, Batteries & Power Banks" }
    ]
  },
  {
    id: "vehicles",
    name: "Vehicles & Transport",
    children: [
      { id: "cars", name: "Cars" },
      { id: "motorcycles", name: "Motorcycles" },
      { id: "trucks", name: "Trucks & Heavy Vehicles" },
      { id: "vehicle-parts", name: "Vehicle Parts" },
      { id: "tires", name: "Tires & Wheels" },
      { id: "oils", name: "Oils & Lubricants" },
      { id: "accessories", name: "Vehicle Accessories" },
      { id: "spare-engines", name: "Spare Engines" }
    ]
  },
  {
    id: "fashion",
    name: "Fashion & Beauty",
    children: [
      { id: "men-clothing", name: "Men Clothing" },
      { id: "women-clothing", name: "Women Clothing" },
      { id: "kids-clothing", name: "Children Clothing" },
      { id: "shoes", name: "Shoes" },
      { id: "bags", name: "Bags & Luggage" },
      { id: "jewelry", name: "Jewelry" },
      { id: "watches", name: "Watches" },
      { id: "cosmetics", name: "Cosmetics" },
      { id: "hair-care", name: "Hair Care Products" }
    ]
  },
  {
    id: "home",
    name: "Home & Living",
    children: [
      { id: "furniture", name: "Furniture" },
      { id: "kitchen", name: "Kitchen Equipment" },
      { id: "appliances", name: "Home Appliances" },
      { id: "decor", name: "Home Decoration" },
      { id: "bedding", name: "Bedding & Mattress" },
      { id: "cleaning", name: "Cleaning Supplies" }
    ]
  },
  {
    id: "food",
    name: "Food & Grocery",
    children: [
      { id: "fresh-food", name: "Fresh Food" },
      { id: "packaged-food", name: "Packaged Food" },
      { id: "beverages", name: "Beverages" },
      { id: "snacks", name: "Snacks" },
      { id: "restaurant", name: "Restaurants & Takeaway" }
    ]
  },
  {
    id: "health",
    name: "Health & Medicine",
    children: [
      { id: "medicine", name: "Medicine" },
      { id: "pharmacy", name: "Pharmacy Products" },
      { id: "supplements", name: "Vitamins & Supplements" },
      { id: "medical-equipment", name: "Medical Equipment" }
    ]
  },
  {
    id: "education",
    name: "Education & Office",
    children: [
      { id: "books", name: "Books" },
      { id: "school-supplies", name: "School Supplies" },
      { id: "office-supplies", name: "Office Supplies" },
      { id: "stationery", name: "Stationery" }
    ]
  },
  {
    id: "construction",
    name: "Construction & Tools",
    children: [
      { id: "building-materials", name: "Building Materials" },
      { id: "tools", name: "Hand & Power Tools" },
      { id: "plumbing", name: "Plumbing Materials" },
      { id: "electrical", name: "Electrical Supplies" }
    ]
  },
  {
    id: "agriculture",
    name: "Agriculture",
    children: [
      { id: "crops", name: "Crops & Seeds" },
      { id: "fertilizers", name: "Fertilizers" },
      { id: "farm-tools", name: "Farm Tools" },
      { id: "livestock", name: "Livestock Supplies" }
    ]
  },
  {
    id: "sports",
    name: "Sports & Entertainment",
    children: [
      { id: "sports-equipment", name: "Sports Equipment" },
      { id: "gym", name: "Gym & Fitness" },
      { id: "outdoor", name: "Outdoor Activities" },
      { id: "games", name: "Games & Toys" }
    ]
  },
  {
    id: "services",
    name: "Services",
    children: [
      { id: "repair", name: "Repair Services" },
      { id: "delivery", name: "Delivery Services" },
      { id: "cleaning-services", name: "Cleaning Services" },
      { id: "freelance", name: "Freelance Services" }
    ]
  },
  {
    id: "digital",
    name: "Digital Goods",
    children: [
      { id: "software", name: "Software" },
      { id: "subscriptions", name: "Subscriptions" },
      { id: "courses", name: "Online Courses" },
      { id: "digital-products", name: "Digital Products" }
    ]
  }
];

/**
 * Flattens the category tree into a map of ID -> Name for O(1) lookups
 */
export const flatCategoryMap = new Map<string, string>();
const populateMap = (nodes: CategoryNode[]) => {
  nodes.forEach(node => {
    flatCategoryMap.set(node.id, node.name);
    if (node.children) {
      populateMap(node.children);
    }
  });
};
populateMap(categoryTree);

/**
 * Normalizes item categories, handling both new string[] and legacy string formats.
 * Prevents duplicates and invalid entries.
 */
export function normalizeCategories(input: { category?: string; categories?: string[] }): string[] {
  if (!input) return [];
  const result: string[] = [];
  
  if (Array.isArray(input.categories)) {
    result.push(...input.categories);
  }
  
  if (typeof input.category === "string" && input.category.trim() !== "") {
    result.push(input.category);
  }
  
  return [...new Set(result)];
}

/**
 * Gets the display name for a category ID. Falls back to returning the ID itself
 * to preserve compatibility with legacy string categories (e.g., "Elektroniki").
 */
export function getCategoryName(id: string): string {
  return flatCategoryMap.get(id) || id;
}

/**
 * Returns the child category ids of a top-level group.
 */
export function getGroupChildren(groupId: string): string[] {
  const group = categoryTree.find((g) => g.id === groupId);
  return group?.children?.map((c) => c.id) || [];
}

/**
 * Maps a free-text category (e.g. what an AI photo read: "Cooking oil",
 * "toiletries") onto one of the given category options — the same options the
 * product form's dropdown shows. Matching, strongest first:
 *   1. exact name/id (case-insensitive),
 *   2. singular/plural variants ("beverages" vs "beverage"),
 *   3. substring either way ("cooking oil" -> "Oils & Lubricants"),
 *   4. word overlap, accepting a category when at least half its words match.
 * Returns the matched category ID, or undefined when nothing fits — the
 * caller then leaves the form field for the merchant to pick.
 */
export function matchCategoryByName(
  raw: string | undefined,
  options: CategoryNode[]
): string | undefined {
  const needle = (raw ?? "").trim().toLowerCase();
  if (!needle || options.length === 0) return undefined;

  const candidates = options.flatMap((opt) => [
    { id: opt.id, label: opt.name.toLowerCase() },
    { id: opt.id, label: opt.id.toLowerCase() },
  ]);

  const exact = candidates.find((c) => c.label === needle);
  if (exact) return exact.id;

  const singularOf = (word: string): string => {
    if (word.endsWith("ies")) return word.slice(0, -3) + "y";
    if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  };
  const wordsOf = (label: string): Set<string> => {
    const words = label.split(/[^a-z0-9]+/).filter(Boolean).map(singularOf);
    return new Set(words);
  };
  const needleWords = wordsOf(needle);

  let best: { id: string; score: number } | undefined;
  for (const candidate of candidates) {
    const candidateWords = wordsOf(candidate.label);
    let overlap = 0;
    candidateWords.forEach((word) => {
      if (needleWords.has(word)) overlap += 1;
    });
    if (overlap === 0) continue;
    const substring = candidate.label.includes(needle) || needle.includes(candidate.label);
    const ratio = overlap / candidateWords.size;
    if (ratio < 0.5 && !substring) continue;
    const score = (substring ? 2 : 0) + ratio;
    if (!best || score > best.score) best = { id: candidate.id, score };
  }
  return best?.id;
}

/**
 * Maps selected business groups to their product categories.
 * Accepts BOTH new group ids (e.g. "food") and legacy business labels
 * (e.g. "Grocery"), so no selection can ever produce an empty step.
 */
export function mapBusinessToProductCategories(businessCategories: string[]): string[] {
  if (!businessCategories || businessCategories.length === 0) return [];

  const legacyMapping: Record<string, string[]> = {
    "Grocery": ["food"],
    "Electronics": ["electronics"],
    "Fashion": ["fashion"],
    "Pharmacy": ["health"],
    "Restaurant": ["food"],
    "Salon": ["fashion", "health"],
    "Hardware": ["construction"],
    "Agriculture": ["agriculture"],
    "Office Supplies": ["education"],
    "Automotive": ["vehicles"],
    "Furniture": ["home"],
    "Other": categoryTree.map((g) => g.id),
  };

  const productCats = new Set<string>();

  businessCategories.forEach((bizCat) => {
    const groupIds = categoryTree.some((g) => g.id === bizCat)
      ? [bizCat]
      : legacyMapping[bizCat] || [];

    groupIds.forEach((gid) => getGroupChildren(gid).forEach((c) => productCats.add(c)));
  });

  return Array.from(productCats);
}

