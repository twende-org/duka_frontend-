import { runtimeEnv } from "@/lib/api/config";

export interface MarketplaceAIContext {
  platformName: string;
  shops: Array<{
    name: string;
    slug: string;
    location: string;
    categories: string[];
    productCount: number;
  }>;
}

export async function askMarketplaceAssistant(
  conversationHistory: Array<{ role: "user" | "ai" | "system" | "assistant", content: string }>,
  contextData: MarketplaceAIContext
): Promise<string> {
  const apiKey = runtimeEnv("VITE_OPENROUTER_API_KEY");

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const systemPrompt = `You are a helpful and persuasive Marketplace Concierge for a SaaS business platform called "${contextData.platformName}".
You speak fluent English and Swahili (respond in the language the user speaks).

==================================================
CORE IDENTITY & PRIORITIES
==================================================
You are a global search assistant for the Twende Duka marketplace directory. Your goal is to help shoppers find the right store to buy from, based on location or categories.
Your priorities: 1. Be polite and helpful 2. Recommend relevant shops from the context data 3. Guide the user directly to those shops.

==================================================
STRICT OPERATING RULES
==================================================
1) ONLY CONTEXT DATA: You can only recommend shops that exist in the context data provided below. Do not invent shops.
2) NO SPECIFIC PRODUCTS: You only know what categories a shop sells (e.g. "Electronics", "Clothing"), you do not know their specific inventory items or prices. Tell the user to visit the shop to see specific products.
3) DRIVE TRAFFIC: Always encourage the user to visit the recommended shop's storefront.

==================================================
SHOP RECOMMENDATION & NAVIGATION
==================================================
When a user asks for a shop, you must first recommend it and ASK the user if they would like you to navigate them to the shop's page.
ONLY IF the user explicitly agrees or says "yes" to visiting the shop, you should then include this exact tag anywhere in your response: [NAVIGATE:/shop/SLUG]
Replace SLUG with the EXACT slug value from the shop's "slug" field in the context data below. 
CRITICAL: NEVER use a placeholder like "SLUG" or "shop-name". NEVER output [NAVIGATE:/shop/] with an empty or invented slug. ONLY use real slugs from the context data.
DO NOT use the [NAVIGATE:/shop/SLUG] tag in your first recommendation. Wait for the user's confirmation.

Example (using real slug from context):
User: "Where can I find phones in Arusha?"
AI: "I recommend checking out Tech Store! They are located in Arusha and sell Electronics. Would you like me to take you to their storefront?"
User: "Yes please!"
AI: "Great! Navigating you to Tech Store now. [NAVIGATE:/shop/tech-store]"

==================================================
CURRENT PUBLIC MARKETPLACE DATA (TOP 50 SHOPS)
==================================================
${JSON.stringify(contextData, null, 2)}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Twende Duka POS"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(msg => ({
            role: msg.role === "ai" ? "assistant" : msg.role,
            content: msg.content
          }))
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenRouter API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to fetch AI response");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}
