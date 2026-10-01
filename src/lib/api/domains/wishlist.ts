/**
 * Wishlist domain adapter (signed-in users only).
 *
 * The legacy backend kept saved products as ``users/{uid}/wishlist/{productId}``; Django
 * models the same thing as one row per (user, product) and addresses rows by
 * the product id, so the storefront button can toggle without a lookup:
 *
 *   GET    /api/v1/wishlist/?page_size=200             -> the caller's items
 *   GET    /api/v1/wishlist/?product_id={id}           -> 0/1 rows (membership)
 *   POST   /api/v1/wishlist/                           -> upsert, 201 on create
 *   POST   /api/v1/wishlist/toggle/                    -> {added: bool}
 *   DELETE /api/v1/wishlist/{productId}/               -> remove one
 *   POST   /api/v1/wishlist/bulk-delete/               -> {deleted: n}
 *
 * Guests never reach this module: ``wishlistService`` keeps its localStorage
 * paths and only calls here while a Django session exists.
 */
import { getApiClient, unwrapList } from "../index";

const WISHLIST_PATH = "/api/v1/wishlist/";

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

/** One saved product, matching the legacy document fields. */
export interface WishlistRow {
  id: string;
  productId: string;
  name: string;
  price: number;
  shopId: string;
  shopName: string;
  wholesalePrice?: number;
  moq?: number;
  /** ISO timestamp; the legacy ``addedAt`` was a timestamp object. */
  addedAt?: string;
}

export interface WishlistInput {
  productId: string;
  name: string;
  price: number;
  shopId: string;
  shopName: string;
  wholesalePrice?: number;
  moq?: number;
}

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
  count?: number;
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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = numberOr(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function fromApiWishlistItem(raw: unknown): WishlistRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id ?? row.productId ?? row.product_id),
    productId: stringOr(row.productId ?? row.product_id ?? row.id),
    name: stringOr(row.name),
    price: numberOr(row.price),
    shopId: stringOr(row.shopId ?? row.shop_id),
    shopName: stringOr(row.shopName ?? row.shop_name),
    wholesalePrice: optionalNumber(row.wholesalePrice ?? row.wholesale_price),
    moq: optionalNumber(row.moq),
    addedAt: optionalString(row.addedAt ?? row.added_at ?? row.createdAt ?? row.created_at),
  };
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

/** The caller's whole wishlist, newest saves first server-side. */
export async function listWishlistItems(): Promise<WishlistRow[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = WISHLIST_PATH;
  let nextQuery: Record<string, string | number> | undefined = { page_size: MAX_PAGE_SIZE };
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(
      nextPath,
      nextQuery ? { query: nextQuery } : undefined
    );
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected.map(fromApiWishlistItem);
}

/** Membership check: the legacy ``getDoc(.../wishlist/{productId})``. */
export async function isWishlisted(productId: string): Promise<boolean> {
  const body = await getApiClient().get<unknown>(WISHLIST_PATH, {
    query: { product_id: productId, page_size: MAX_PAGE_SIZE },
  });
  return unwrapList<unknown>(body).length > 0;
}

/** Upsert: re-adding an existing product refreshes its stored snapshot. */
export async function addWishlistItem(input: WishlistInput): Promise<WishlistRow> {
  return fromApiWishlistItem(await getApiClient().post<unknown>(WISHLIST_PATH, input));
}

/** Flip membership server-side; resolves to the new state (true = added). */
export async function toggleWishlistItemOnApi(input: WishlistInput): Promise<boolean> {
  const body = await getApiClient().post<unknown>(`${WISHLIST_PATH}toggle/`, input);
  return isRecord(body) && body.added === true;
}

/** Remove one product from the wishlist. */
export async function deleteWishlistItem(productId: string): Promise<void> {
  await getApiClient().del<unknown>(`${WISHLIST_PATH}${encodeURIComponent(productId)}/`);
}

/** Multi-select removal; resolves to the number of rows actually deleted. */
export async function deleteWishlistItems(productIds: string[]): Promise<number> {
  const body = await getApiClient().post<unknown>(`${WISHLIST_PATH}bulk-delete/`, {
    productIds,
  });
  return isRecord(body) ? numberOr(body.deleted) : 0;
}
