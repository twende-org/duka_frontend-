/**
 * AI domain adapter for the strangler-fig cutover.
 *
 * `src/lib/ai.ts` used to call OpenRouter from the browser with the bundled
 * `VITE_OPENROUTER_API_KEY`; the Django endpoints run the same prompts
 * server-side and answer the same shapes:
 *
 *   POST /api/v1/ai/assistant/       -> { reply }
 *   POST /api/v1/ai/extract-product/ -> { details: {name?, brand?, ...} }
 *   POST /api/v1/ai/generate-copy/   -> { text }
 *
 * The widgets render the legacy error copy, so failures are re-thrown with the
 * exact messages the browser helpers always produced.
 */
import { getApiClient } from "../index";

export interface ProductDetails {
  name?: string;
  brand?: string;
  description?: string;
  barcode?: string;
  unit?: string;
  category?: string;
  size?: string;
  weight?: string;
  color?: string;
  expiryDate?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  /** Leftover details the model read that have no dedicated form field. */
  extra?: Record<string, string>;
}

/** Copy of the legacy ``askBusinessAssistant`` failure message. */
const ASSISTANT_ERROR =
  "Kuna tatizo kuunganisha na Twende AI kwa sasa. Tafadhali jaribu tena baadaye.";
/** Copy of the legacy image-extraction failure message. */
const EXTRACTION_ERROR = "Failed to extract details from image.";
/** Copy of the legacy answer when the model said nothing usable. */
export const FALLBACK_REPLY = "Samahani, sijaelewa. Tafadhali rudia.";

const STRING_FIELDS = [
  "name",
  "brand",
  "description",
  "barcode",
  "unit",
  "category",
  "size",
  "weight",
  "color",
  "expiryDate",
] as const;
const NUMBER_FIELDS = ["buyingPrice", "sellingPrice", "quantity"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function askBusinessAssistant(
  shopName: string,
  userMessage: string,
  contextData: unknown
): Promise<string> {
  try {
    const body = await getApiClient().post<unknown>("/api/v1/ai/assistant/", {
      message: userMessage,
      shopName,
      context: contextData ?? {},
    });
    const row = isRecord(body) ? body : {};
    const reply = typeof row.reply === "string" ? row.reply : "";
    return reply || FALLBACK_REPLY;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw new Error(ASSISTANT_ERROR);
  }
}

export function toProductDetails(raw: unknown): ProductDetails {
  const row = isRecord(raw) ? raw : {};
  const details: ProductDetails = {};
  for (const field of STRING_FIELDS) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) details[field] = value.trim();
  }
  for (const field of NUMBER_FIELDS) {
    const value = row[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      details[field] = value;
    } else if (typeof value === "string") {
      const match = value.match(/\d[\d,]*(?:\.\d+)?/);
      const parsed = match ? Number(match[0].replace(/,/g, "")) : NaN;
      if (Number.isFinite(parsed)) details[field] = parsed;
    }
  }
  if (isRecord(row.extra)) {
    const extra: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.extra)) {
      if (typeof value === "string" && value.trim()) extra[key] = value.trim();
    }
    if (Object.keys(extra).length > 0) details.extra = extra;
  }
  return details;
}

export async function extractProductDetailsFromImage(
  imageBase64: string,
  categoryNames?: string[]
): Promise<ProductDetails> {
  try {
    const body: Record<string, unknown> = { image: imageBase64 };
    if (categoryNames && categoryNames.length > 0) body.categoryNames = categoryNames;
    const response = await getApiClient().post<unknown>("/api/v1/ai/extract-product/", body);
    const row = isRecord(response) ? response : {};
    return toProductDetails(row.details);
  } catch (error) {
    console.error("AI Image Extraction Error:", error);
    throw new Error(EXTRACTION_ERROR);
  }
}

/** Every distinct product the model found in one photo (nameless entries dropped). */
export async function extractProductDetailsListFromImage(
  imageBase64: string,
  categoryNames?: string[]
): Promise<ProductDetails[]> {
  try {
    const body: Record<string, unknown> = { image: imageBase64 };
    if (categoryNames && categoryNames.length > 0) body.categoryNames = categoryNames;
    const response = await getApiClient().post<unknown>("/api/v1/ai/extract-products/", body);
    const row = isRecord(response) ? response : {};
    const list = Array.isArray(row.details) ? row.details : [];
    return list
      .map(toProductDetails)
      .filter((details) => Boolean(details.name));
  } catch (error) {
    console.error("AI Image Extraction Error:", error);
    throw new Error(EXTRACTION_ERROR);
  }
}

/**
 * Raw completion for a fully built marketing-copy prompt (the ad generator
 * and the feed/sold-out caption dialogs). The prompt/model used to run in
 * the browser with the bundled `VITE_OPENROUTER_API_KEY`; dialogs keep their
 * local fence-stripping/JSON parsing, so the raw text is returned as-is.
 */
export async function generateAICopy(prompt: string): Promise<string> {
  const body = await getApiClient().post<unknown>("/api/v1/ai/generate-copy/", { prompt });
  const row = isRecord(body) ? body : {};
  return typeof row.text === "string" ? row.text : "";
}
