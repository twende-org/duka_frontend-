import Fuse from "fuse.js";

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

let suggestionIndex: Fuse<SearchSuggestion> | null = null;

export function buildSearchIndex(suggestions: SearchSuggestion[]) {
  suggestionIndex = new Fuse(suggestions, {
    keys: [
      { name: 'text', weight: 0.7 },
      { name: 'subtitle', weight: 0.3 }
    ],
    threshold: 0.4,
    ignoreLocation: true
  });
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

export function getTrendingSearches(): RichSearchItem[] {
  return [
    { text: "Samsung S24 Ultra", imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=200&h=200" },
    { text: "Running Shoes", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=200&h=200" },
    { text: "Laptop for University", imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=200&h=200" },
    { text: "Smart TV 55 inch", imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&q=80&w=200&h=200" },
    { text: "Men's Watches", imageUrl: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=200&h=200" }
  ];
}

export function getInstantSuggestions(query: string): SearchSuggestion[] {
  if (!query) return [];
  
  if (suggestionIndex) {
    return suggestionIndex.search(query).map(r => r.item).slice(0, 5);
  }
  
  const q = query.toLowerCase();
  const suggestions: SearchSuggestion[] = [];
  
  if ("electronics".includes(q) || "phones".includes(q)) {
    suggestions.push({ id: `cat-${q}`, type: "category", text: "Electronics & Phones" });
  }
  if ("fashion".includes(q) || "shoes".includes(q)) {
    suggestions.push({ id: `cat-fashion-${q}`, type: "category", text: "Fashion & Shoes" });
  }
  
  if (q.length > 2) {
    suggestions.push({ id: `prod-1-${q}`, type: "product", text: `${query} Pro Max`, subtitle: "In Electronics" });
    suggestions.push({ id: `prod-2-${q}`, type: "product", text: `Premium ${query}`, subtitle: "Best seller" });
    suggestions.push({ id: `shop-1-${q}`, type: "shop", text: `${query} Official Store`, subtitle: "Verified Shop" });
  }
  
  return suggestions;
}
