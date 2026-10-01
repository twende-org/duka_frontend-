/**
 * Marketing domain adapter: discount codes and campaigns.
 *
 * `Marketing.tsx` and `Reports.tsx` keep calling the same functions they called
 * on the legacy backend (`getShopDiscounts`, `createDiscountCode`, `getCampaigns`,
 * `createCampaign`), so this module translates:
 *   - DRF rows to the app's `DiscountCode` / `Campaign` shapes. The Django
 *     models carry fewer columns than the legacy documents (no
 *     `minPurchaseAmount` / `usageLimit` / `expiryDate` on discounts), so those
 *     optional fields simply stay absent, and numeric campaign metrics come
 *     back as numbers instead of strings,
 *   - the legacy habit of swallowing read errors: both list functions return
 *     `[]` so a failing fetch never blanks out the page with a crash.
 */
import type { Campaign, DiscountCode } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const DISCOUNTS_PATH = "/api/v1/discounts/";
const CAMPAIGNS_PATH = "/api/v1/campaigns/";

/** DRF's max_page_size; the "fetch everything" contract needs the biggest page. */
const MAX_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link: 100 * 200 rows is far past any shop. */
const MAX_PAGES = 100;

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = numberOr(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A foreign-key id, whether the serializer inlined it or sent the app-visible id. */
function refId(value: unknown): string {
  if (isRecord(value)) return stringOr(value.legacyId) || stringOr(value.id);
  return stringOr(value);
}

/** DRF's `next` is absolute; the client only accepts relative paths. */
function relativePath(target: string): string {
  if (target.startsWith("/")) return target;
  try {
    const url = new URL(target, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return target;
  }
}

/** Walk DRF's page links to honour the old "returned everything" contract. */
async function fetchAll<T>(path: string, query: Record<string, string | number>): Promise<T[]> {
  const client = getApiClient();
  const collected: T[] = [];
  let nextPath: string | null = path;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<T>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function optionalOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

const DISCOUNT_TYPES = ["percentage", "fixed"] as const;
const DISCOUNT_STATUSES = ["active", "expired", "disabled"] as const;
const CAMPAIGN_STATUSES = ["running", "completed", "draft"] as const;
const AUDIENCE_FILTERS = ["all", "recent", "dormant", "vip"] as const;
const CHANNELS = ["sms", "whatsapp", "email"] as const;

export function fromApiDiscountCode(raw: unknown): DiscountCode {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    shopId: refId(row.shopId),
    code: stringOr(row.code),
    type: oneOf(row.type, DISCOUNT_TYPES, "percentage"),
    value: numberOr(row.value),
    usedCount: numberOr(row.usedCount),
    status: oneOf(row.status, DISCOUNT_STATUSES, "active"),
    createdAt: stringOr(row.createdAt),
    // minPurchaseAmount / maxDiscountAmount / usageLimit / startDate /
    // expiryDate have no Django column yet; they stay absent so the UI's
    // optional checks keep behaving as "not configured".
  };
}

/** Errors resolve to `[]`, so the page never blanks. */
export async function getShopDiscounts(shopId: string): Promise<DiscountCode[]> {
  try {
    const rows = await fetchAll<unknown>(DISCOUNTS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
    return rows.map(fromApiDiscountCode);
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return [];
  }
}

export async function createDiscountCode(
  discount: Omit<DiscountCode, "id" | "createdAt" | "usedCount">
): Promise<string> {
  const body = await getApiClient().post<unknown>(DISCOUNTS_PATH, {
    shopId: discount.shopId,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    status: discount.status,
  });
  return fromApiDiscountCode(body).id;
}

export async function updateDiscountStatus(
  discountId: string,
  status: DiscountCode["status"]
): Promise<void> {
  await getApiClient().patch<unknown>(`${DISCOUNTS_PATH}${encodeURIComponent(discountId)}/`, { status });
}

export function fromApiCampaign(raw: unknown): Campaign {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    shopId: refId(row.shopId),
    name: stringOr(row.name),
    source: stringOr(row.source),
    platform: stringOr(row.platform),
    status: oneOf(row.status, CAMPAIGN_STATUSES, "completed"),
    // The backend stores reach as an integer; the UI renders it as-is.
    reach: numberOr(row.reach),
    engagement: optionalString(row.engagement),
    spend: optionalNumber(row.spend),
    revenue: optionalNumber(row.revenue),
    roi: optionalNumber(row.roi),
    startDate: optionalString(row.startDate),
    createdAt: optionalString(row.createdAt),
    audienceFilter: optionalOneOf(row.audienceFilter, AUDIENCE_FILTERS),
    promoCodeId: optionalString(refId(row.promoCodeId)),
    channel: optionalOneOf(row.channel, CHANNELS),
  };
}

/** Errors resolve to `[]`, so the page never blanks. */
export async function getCampaigns(shopId: string): Promise<Campaign[]> {
  try {
    const rows = await fetchAll<unknown>(CAMPAIGNS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
    return rows.map(fromApiCampaign);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
}

/** The camelCase aliases `CampaignSerializer` accepts; both key styles work. */
function campaignPayload(data: Omit<Campaign, "id" | "createdAt">): Record<string, unknown> {
  const payload: Record<string, unknown> = { shopId: data.shopId };
  if (data.name !== undefined) payload.name = data.name;
  if (data.source !== undefined) payload.source = data.source;
  if (data.platform !== undefined) payload.platform = data.platform;
  if (data.status !== undefined) payload.status = data.status;
  if (data.reach !== undefined) payload.reach = data.reach;
  if (data.engagement !== undefined) payload.engagement = String(data.engagement);
  if (data.spend !== undefined) payload.spend = data.spend;
  if (data.revenue !== undefined) payload.revenue = data.revenue;
  if (data.roi !== undefined) payload.roi = data.roi;
  if (data.startDate !== undefined) payload.startDate = data.startDate;
  if (data.audienceFilter !== undefined) payload.audienceFilter = data.audienceFilter;
  if (data.channel !== undefined) payload.channel = data.channel;
  if (data.promoCodeId !== undefined) payload.promoCodeId = data.promoCodeId;
  return payload;
}

export async function createCampaign(campaign: Omit<Campaign, "id" | "createdAt">): Promise<string> {
  const body = await getApiClient().post<unknown>(CAMPAIGNS_PATH, campaignPayload(campaign));
  return fromApiCampaign(body).id ?? "";
}
