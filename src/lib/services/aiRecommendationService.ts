// src/lib/services/aiRecommendationService.ts

import { getApiClient } from "@/lib/api/index";

export interface ParsedAIFilter {
  originalQuery: string;
  cleanQuery: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  attributes?: Record<string, string>;
  isNaturalLanguage: boolean;
}

/**
 * Parses natural language into structured commerce filters via the anonymous
 * server endpoint (the prompt/model used to run here with the bundled
 * VITE_OPENROUTER_API_KEY). e.g., "Samsung phone under TZS 500,000" ->
 * { brand: "Samsung", maxPrice: 500000, category: "phone" }. Any failure —
 * including a missing server key (503) — falls back to local basic parsing,
 * exactly like the legacy browser helper.
 */
export async function parseQueryWithAI(naturalLanguageQuery: string): Promise<ParsedAIFilter> {
  try {
    const parsed = await getApiClient().post<{
      cleanQuery?: string;
      category?: string;
      brand?: string;
      maxPrice?: number;
      minPrice?: number;
    }>(
      "/api/v1/ai/parse-search/",
      { query: naturalLanguageQuery },
      { auth: false },
    );

    return {
      originalQuery: naturalLanguageQuery,
      cleanQuery: parsed.cleanQuery || naturalLanguageQuery,
      category: parsed.category,
      brand: parsed.brand,
      maxPrice: parsed.maxPrice,
      minPrice: parsed.minPrice,
      isNaturalLanguage: true,
    };
  } catch (error) {
    console.error("AI Search Error:", error);
    return basicFallbackParsing(naturalLanguageQuery);
  }
}

function basicFallbackParsing(naturalLanguageQuery: string): ParsedAIFilter {
  const lowerQuery = naturalLanguageQuery.toLowerCase();
  let maxPrice: number | undefined;
  
  const maxPriceMatch = lowerQuery.match(/(?:under|below|chini ya)\s+(?:tzs\s*|tsh\s*|shs\s*)?(\d+(?:,\d+)*)/);
  if (maxPriceMatch) {
    maxPrice = parseInt(maxPriceMatch[1].replace(/,/g, ''), 10);
  }
  
  const stopWords = [
    "give", "me", "a", "an", "the", "i", "want", "looking", "for", "to", "buy", "show", "some", "good", "cheap", "best", "new",
    "nataka", "natafuta", "nipe", "niletee", "naomba", "tafadhali", "please", "can", "you", "find", 
    "under", "below", "chini", "ya", "tzs", "tsh", "shs"
  ];
  
  let cleanQuery = lowerQuery
    .replace(/(?:under|below|chini ya)\s+(?:tzs\s*|tsh\s*|shs\s*)?(\d+(?:,\d+)*)/g, '')
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 1)
    .join(" ");

  return {
    originalQuery: naturalLanguageQuery,
    cleanQuery: cleanQuery.trim() || naturalLanguageQuery.trim(),
    maxPrice,
    isNaturalLanguage: true,
  };
}
