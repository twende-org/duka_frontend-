/**
 * Merchant shop-settings adapter (the legacy ``shops/{id}/settings/default`` doc).
 *
 * Django serves the same camelCase groups off the shop row:
 *
 *   GET    /api/v1/shops/{id}/settings/   -> the settings groups
 *   PATCH  /api/v1/shops/{id}/settings/   -> merge a subset of groups
 *
 * Reads are open to any shop member; writes require an owner/manager role, so
 * a PATCH can answer 403 for an attendant — callers keep their own guard.
 *
 * ``businessInfo`` is the one lossy group: the wizard posts ``{tin,
 * licenseNumber}`` while the columns are flat on the model, and the serializer
 * flattens/regroups on the way in and out.
 */
import type { ShopSettings } from "@/types";
import { getApiClient } from "../index";

const SHOPS_PATH = "/api/v1/shops/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalObject<T>(value: unknown): T | undefined {
  return isRecord(value) ? (value as T) : undefined;
}

function settingsPath(shopId: string): string {
  return `${SHOPS_PATH}${encodeURIComponent(shopId)}/settings/`;
}

export function fromApiShopSettings(raw: unknown, fallbackShopId = ""): ShopSettings {
  const row = isRecord(raw) ? raw : {};
  return {
    shopId: stringOr(row.shopId ?? row.shop_id ?? row.id, fallbackShopId),
    businessInfo: optionalObject<NonNullable<ShopSettings["businessInfo"]>>(row.businessInfo),
    pricing: optionalObject<NonNullable<ShopSettings["pricing"]>>(row.pricing),
    inventory: optionalObject<NonNullable<ShopSettings["inventory"]>>(row.inventory),
    customers: optionalObject<NonNullable<ShopSettings["customers"]>>(row.customers),
    payments: optionalObject<NonNullable<ShopSettings["payments"]>>(row.payments),
    onlineStore: optionalObject<NonNullable<ShopSettings["onlineStore"]>>(row.onlineStore),
    socialLinks: optionalObject<NonNullable<ShopSettings["socialLinks"]>>(row.socialLinks),
    payoutDetails: optionalObject<NonNullable<ShopSettings["payoutDetails"]>>(row.payoutDetails),
    storePolicies: optionalObject<NonNullable<ShopSettings["storePolicies"]>>(row.storePolicies),
    aiMarketing: optionalObject<NonNullable<ShopSettings["aiMarketing"]>>(row.aiMarketing),
  };
}

export async function getShopSettings(shopId: string): Promise<ShopSettings> {
  return fromApiShopSettings(await getApiClient().get<unknown>(settingsPath(shopId)), shopId);
}

export async function updateShopSettings(
  shopId: string,
  data: Partial<ShopSettings>
): Promise<ShopSettings> {
  return fromApiShopSettings(
    await getApiClient().patch<unknown>(settingsPath(shopId), data),
    shopId
  );
}
