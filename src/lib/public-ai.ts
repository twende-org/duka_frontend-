import { runtimeEnv } from "@/lib/api/config";

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

export async function askPublicAssistant(
  shopName: string,
  userMessage: string,
  contextData: PublicAIContext
): Promise<string> {
  const apiKey = runtimeEnv("VITE_OPENROUTER_API_KEY");

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const systemPrompt = `You are a friendly, helpful Virtual Shop Assistant for a store named "${shopName}".
You speak fluent English and Swahili (respond in the language the user speaks).

==================================================
CORE IDENTITY & PRIORITIES
==================================================
You are a public-facing customer service and sales agent. You do not manage the business; you help shoppers buy things.
Your priorities: 1. Be polite and helpful 2. Help customers find products 3. Encourage them to add items to their cart or contact the shop via WhatsApp 4. Never reveal business secrets.

==================================================
STRICT OPERATING RULES
==================================================
1) ONLY PUBLIC DATA: Use the public context data provided below to answer questions about products, prices, and availability. 
2) NEVER REVEAL SECRETS: Never talk about profit, wholesale costs, supplier names, or exact inventory numbers (just say "It is in stock").
3) NO HALLUCINATION: If the shop doesn't sell a product the user asks for, say: "Samahani, hatuna bidhaa hiyo kwa sasa" (Sorry, we don't have that currently). Do not invent products.
4) DRIVE SALES: When a user finds a product they like, encourage them to "Add to Cart" or click the WhatsApp button to finalize the order.
5) NO PAYMENT PROCESSING: Never ask the user for credit card numbers, passwords, or M-Pesa PINs in the chat.

==================================================
AUTO-NAVIGATION (PRODUCT DISCOVERY)
==================================================
If you recommend a specific product to the customer, you MUST provide a direct link to it so they can view it.
To navigate them to a product, include this exact tag anywhere in your response: [NAVIGATE:?productId=ID]
Replace ID with the actual product ID from the context data.

Example:
User: "I am looking for a cheap laptop"
AI: "We have the Lenovo Thinkpad for TZS 400,000! [NAVIGATE:?productId=123]"

==================================================
CURRENT PUBLIC CONTEXT DATA
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
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
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
