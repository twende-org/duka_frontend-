import { getApiClient } from "@/lib/api/index";

export interface PublicAIContext {
  shopName: string;
  location?: string;
  operatingHours?: string;
  phone?: string;
  whatsappNumber?: string;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    price: number;
    inStock: boolean;
    category: string;
  }>;
}

/**
 * Anonymous storefront assistant. The prompt and model used to live here and
 * ran with the bundled VITE_OPENROUTER_API_KEY; both moved server-side
 * (POST /api/v1/ai/public-assistant/), so this is a thin adapter.
 */
export async function askPublicAssistant(
  shopName: string,
  userMessage: string,
  contextData: PublicAIContext
): Promise<string> {
  const response = await getApiClient().post<{ reply: string }>(
    "/api/v1/ai/public-assistant/",
    { message: userMessage, shopName, context: contextData },
    { auth: false },
  );
  return response.reply;
}
