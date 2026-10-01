// src/lib/services/aiRecommendationService.ts

import { runtimeEnv } from "@/lib/api/config";

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
 * Stubs a future AI service that parses natural language into structured commerce filters.
 * e.g., "Samsung phone under TZS 500,000" -> { brand: "Samsung", maxPrice: 500000, category: "phone" }
 */
export async function parseQueryWithAI(naturalLanguageQuery: string): Promise<ParsedAIFilter> {
  const apiKey = runtimeEnv("VITE_OPENROUTER_API_KEY");
  if (!apiKey) {
    console.error("OpenRouter API key missing. Falling back to basic parsing.");
    return basicFallbackParsing(naturalLanguageQuery);
  }

  const systemPrompt = `You are a commerce search intent analyzer for a Tanzanian marketplace. You extract structured filter criteria from a user's natural language search query in either English or Swahili.
Respond ONLY with a JSON object with the following structure, with NO markdown formatting, NO backticks, and NO additional text:
{
  "cleanQuery": "the core search terms translated into BOTH English and Swahili, separated by a space (so it matches products named in either language)",
  "category": "product category if specified (e.g. phones, electronics, shoes)",
  "brand": "brand name if specified",
  "maxPrice": numeric maximum price in TZS if specified,
  "minPrice": numeric minimum price in TZS if specified
}

Example 1: "I want to buy a samsung phone under 500,000 tzs"
{"cleanQuery": "phone simu", "category": "phones", "brand": "samsung", "maxPrice": 500000}

Example 2: "natafuta viatu vya kukimbilia chini ya elfu 50"
{"cleanQuery": "viatu vya kukimbilia running shoes", "category": "shoes", "maxPrice": 50000}
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 150,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: naturalLanguageQuery }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Attempt to parse JSON response
    // Strip markdown blocks if the AI accidentally adds them
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(content);
    
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
