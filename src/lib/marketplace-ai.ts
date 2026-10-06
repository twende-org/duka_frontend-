import { getApiClient } from "@/lib/api/index";

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

/**
 * Anonymous marketplace concierge. The prompt and model used to live here
 * and ran with the bundled VITE_OPENROUTER_API_KEY; both moved server-side
 * (POST /api/v1/ai/marketplace-assistant/), so this is a thin adapter.
 */
export async function askMarketplaceAssistant(
  conversationHistory: Array<{ role: "user" | "ai" | "system" | "assistant", content: string }>,
  contextData: MarketplaceAIContext
): Promise<string> {
  const response = await getApiClient().post<{ reply: string }>(
    "/api/v1/ai/marketplace-assistant/",
    { messages: conversationHistory, context: contextData },
    { auth: false },
  );
  return response.reply;
}
