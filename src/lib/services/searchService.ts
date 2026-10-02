import type { Shop } from "@/types";
import {
  getPublicTrendingSearches,
  searchPublicProducts,
  searchPublicShops,
} from "@/lib/api/domains/storefront";

export const SEARCH_HISTORY_KEY = "twende_search_history";
export const RECENTLY_VIEWED_KEY = "twende_recently_viewed";

export interface SearchSuggestion {
  id: string;
  type: "product" | "shop" | "category" | "brand" | "history" | "trending";
  text: string;
  subtitle?: string;
  url?: string;
  imageUrl?: string;
}

export interface RichSearchItem {
  text: string;
  imageUrl?: string;
}

export function getSearchHistory(): RichSearchItem[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!history) return [];
    const parsed = JSON.parse(history);
    // Migration: if it's an array of strings, map to RichSearchItem
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((text: string) => ({ text }));
    }
    return parsed;
  } catch (e) {
    return [];
  }
}

export function addSearchToHistory(query: string, imageUrl?: string) {
  if (!query || query.trim() === "") return;
  const history = getSearchHistory();
  const newItem = { text: query.trim(), imageUrl };
  const filtered = history.filter(q => q.text.toLowerCase() !== query.trim().toLowerCase());
  const updated = [newItem, ...filtered].slice(0, 5);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/**
 * Real search demand (top queries of the last 30 days) as recorded by the
 * telemetry endpoint. An empty array means nobody has searched yet — callers
 * must render no trending section rather than invent one.
 */
export async function fetchTrendingSearches(): Promise<RichSearchItem[]> {
  const rows = await getPublicTrendingSearches();
  return rows.map((row) => ({ text: row.query }));
}

export type SuggestionContext = "marketplace" | "wholesale";

function shopToSuggestion(shop: Shop): SearchSuggestion {
  return {
    id: `shop-${shop.id}`,
    type: "shop",
    text: shop.name,
    subtitle: shop.location || (shop.businessCategories || []).slice(0, 2).join(", ") || undefined,
    url: `/shop/${encodeURIComponent(shop.slug || shop.id)}`,
    imageUrl: shop.imageUrl,
  };
}

/**
 * Server-backed autocomplete. Marketplace suggestions mix ranked products and
 * ranked shops; wholesale suggestions are supplier shops only. A failing
 * source degrades to the other, and a total failure to [] — the caller keeps
 * the "press Enter to search" fallback.
 */
export async function fetchInstantSuggestions(
  query: string,
  context: SuggestionContext = "marketplace"
): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (context === "wholesale") {
    const shops = await searchPublicShops({ q, isWholesaleSupplier: true, pageSize: 6 });
    return shops.map(shopToSuggestion);
  }

  const [productResult, shopResult] = await Promise.allSettled([
    searchPublicProducts({ q, pageSize: 6 }),
    searchPublicShops({ q, isPublic: true, pageSize: 4 }),
  ]);

  const products = productResult.status === "fulfilled" ? productResult.value.products : [];
  const shops = shopResult.status === "fulfilled" ? shopResult.value : [];

  return [
    ...products.map((product): SearchSuggestion => ({
      id: `product-${product.id}`,
      type: "product",
      text: product.name,
      subtitle: product.brand || product.category,
      imageUrl: product.imageUrl,
    })),
    ...shops.map(shopToSuggestion),
  ];
}
