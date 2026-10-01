/**
 * Insights domain adapter for the strangler-fig cutover.
 *
 * `AIBusinessCoach.tsx` (and the unused `InsightsCard.tsx`) used to read the
 * dashboard numbers straight from the legacy backend and call OpenRouter from the
 * browser with the bundled `VITE_OPENROUTER_API_KEY`. The Django endpoint runs
 * that whole pipeline server-side and answers the same insight shape the
 * components render, plus the raw numbers they use for their local fallback
 * tips:
 *
 *   GET /api/v1/shops/<shopId>/insights/?lang=sw
 *   -> { insights: [{type, text}], data: {todaySales, yesterdaySales,
 *        todayExpenses, lowStockItems} }
 *
 * An empty `insights` array is a normal answer (AI unavailable) — the callers
 * keep their own fallback generators, so this module never invents tips.
 */
import { getApiClient } from "../index";

export type InsightType = "success" | "warning" | "info";

export interface InsightItem {
  type: InsightType;
  text: string;
}

export interface InsightsSnapshot {
  todaySales: number;
  yesterdaySales: number;
  todayExpenses: number;
  /** `"Name (qty)"` labels, the format the components already display. */
  lowStockItems: string[];
}

export interface ShopInsights {
  insights: InsightItem[];
  data: InsightsSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toInsightType(value: unknown): InsightType {
  return value === "success" || value === "warning" ? value : "info";
}

export function toInsightItem(raw: unknown): InsightItem | null {
  const row = isRecord(raw) ? raw : {};
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!text) return null;
  return { type: toInsightType(row.type), text };
}

export function toInsightsSnapshot(raw: unknown): InsightsSnapshot {
  const row = isRecord(raw) ? raw : {};
  const lowStock = Array.isArray(row.lowStockItems)
    ? row.lowStockItems.filter((item): item is string => typeof item === "string")
    : [];
  return {
    todaySales: toNumber(row.todaySales),
    yesterdaySales: toNumber(row.yesterdaySales),
    todayExpenses: toNumber(row.todayExpenses),
    lowStockItems: lowStock,
  };
}

export async function fetchShopInsights(shopId: string, lang: string): Promise<ShopInsights> {
  const body = await getApiClient().get<unknown>(
    `/api/v1/shops/${encodeURIComponent(shopId)}/insights/`,
    { query: { lang: lang === "en" ? "en" : "sw" } }
  );
  const row = isRecord(body) ? body : {};
  const insights = Array.isArray(row.insights)
    ? row.insights.map(toInsightItem).filter((item): item is InsightItem => item !== null)
    : [];
  return { insights, data: toInsightsSnapshot(row.data) };
}
