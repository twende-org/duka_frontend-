/**
 * Public storefront domain adapter for the strangler-fig cutover.
 *
 * These reads feed the consumer pages — landing, shop directory, shop detail,
 * wholesale directory, supplier quick view — which keep calling the same four
 * functions they called before. Two rules keep the behaviour identical:
 *
 *   - Every read is anonymous (`auth: false`): the endpoints are public, and a
 *     stale token must degrade to a visitor, not to a 401.
 *   - Merchant-confidential product fields never reach these pages: the products
 *     adapter is reused and cost/sourcing fields are then explicitly blanked, so
 *     a serializer regression cannot leak them into the storefront.
 */
import type { Product, Shop, Stock } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";
import { ApiError } from "../errors";
import { fromApiProduct } from "./products";

const PUBLIC_SHOPS_PATH = "/api/v1/public/shops/";

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
  return typeof value === "string" ? value : undefined;
}

/** Absent arrays stay `undefined` so `shop.categories || …` fallbacks still work. */
function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
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

/** legacyId first: it is the id every existing document and backlink uses. */
function appVisibleId(row: Record<string, unknown>): string {
  const legacy = stringOr(row.legacyId);
  return legacy || stringOr(row.id);
}

/** Django's JSONFields default to `{}`; legacy pages treat that as "unset". */
function optionalObject<T>(value: unknown): T | undefined {
  return isRecord(value) && Object.keys(value).length > 0 ? (value as T) : undefined;
}

/**
 * The public shop payload deliberately withholds `ownerId` and sales figures;
 * every consumer of these reads is a storefront page, and the admin pages that
 * need the full document use `getAllShopsAdmin` instead.
 */
export function fromApiShop(raw: unknown): Shop {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    name: stringOr(row.name),
    slug: optionalString(row.slug),
    location: stringOr(row.location),
    ownerId: stringOr(row.ownerId),
    phone: optionalString(row.phone),
    whatsappNumber: optionalString(row.whatsappNumber),
    description: optionalString(row.description),
    lat: optionalNumber(row.lat),
    lon: optionalNumber(row.lon),
    imageUrl: optionalString(row.imageUrl),
    coverImage: optionalString(row.coverImage),
    isPublic: Boolean(row.isPublic),
    isWholesaleSupplier: Boolean(row.isWholesaleSupplier),
    operatingHours: optionalString(row.operatingHours),
    facebookUrl: optionalString(row.facebookUrl),
    instagramUrl: optionalString(row.instagramUrl),
    productCondition: (row.productCondition as Shop["productCondition"]) ?? undefined,
    businessCategories: optionalStringArray(row.businessCategories),
    productCategories: optionalStringArray(row.productCategories),
    followerCount: optionalNumber(row.followerCount),
    businessType: optionalString(row.businessType),
    country: optionalString(row.country),
    region: optionalString(row.region),
    district: optionalString(row.district),
    currency: optionalString(row.currency),
    language: optionalString(row.language),
    timezone: optionalString(row.timezone),
    slogan: optionalString(row.slogan),
    website: optionalString(row.website),
    tiktokUrl: optionalString(row.tiktokUrl),
    email: optionalString(row.email),
    keepsStock: Boolean(row.keepsStock),
    trackInventory: Boolean(row.trackInventory),
    shopTypes: optionalStringArray(row.shopTypes),
    customerTypes: optionalStringArray(row.customerTypes),
    pricingModels: optionalStringArray(row.pricingModels),
    inventoryModel: optionalString(row.inventoryModel),
    stockLocations: optionalStringArray(row.stockLocations),
    fulfillmentMethods: optionalStringArray(row.fulfillmentMethods),
    serviceCoverage: optionalStringArray(row.serviceCoverage),
    salesChannels: optionalStringArray(row.salesChannels),
    // ShopDetail renders the storefront theme and the policies tab from these.
    onlineStore: optionalObject<NonNullable<Shop["onlineStore"]>>(row.onlineStore),
    storePolicies: optionalObject<NonNullable<Shop["storePolicies"]>>(row.storePolicies),
  };
}

/**
 * Storefront product shape. `Product` declares buyingPrice and supplier as
 * required, so they are blanked explicitly instead of silently keeping whatever
 * a payload happens to carry — no storefront page reads them.
 */
export function fromApiPublicProduct(raw: unknown): Product {
  const product = fromApiProduct(raw);
  const row = isRecord(raw) ? raw : {};
  return {
    ...product,
    buyingPrice: undefined,
    supplier: undefined,
    supplierShopId: undefined,
    sourceProductId: undefined,
    taxRate: undefined,
    attributes: undefined,
    variants: undefined,
    // The storefront hides rows at zero stock; a shop with no inventory rows
    // reads as out of stock, exactly like the old `stockMap.get(id) ?? 0`.
    stock: numberOr(row.stock, 0),
    minStock: numberOr(row.minStock, 5),
  } as unknown as Product;
}

/**
 * The shop cards and share dialogs read stock through `Map<string, Stock>`, the
 * shape the separate inventory read used to return. Stock now travels on each
 * product row, so this rebuilds that map without a second request.
 */
export function stockMapFromProducts(products: Product[]): Map<string, Stock> {
  return new Map(
    products.map((product) => [
      product.id,
      {
        id: product.id,
        productId: product.id,
        shopId: product.shopId,
        quantity: product.stock ?? 0,
        minStock: product.minStock ?? 5,
        lastUpdated: (product.updatedAt ?? product.createdAt ?? "") as Stock["lastUpdated"],
      } as Stock,
    ])
  );
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
    const body = await client.get<DrfPage<T>>(nextPath, { query: nextQuery, auth: false });
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** Every shop, public directory or not. */
export async function getAllShops(): Promise<Shop[]> {
  const rows = await fetchAll<unknown>(PUBLIC_SHOPS_PATH, { page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiShop);
}

export async function getWholesaleSuppliers(): Promise<Shop[]> {
  const rows = await fetchAll<unknown>(PUBLIC_SHOPS_PATH, {
    is_wholesale_supplier: "true",
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiShop);
}

/**
 * Resolve a storefront URL segment (stored slug, legacy/Django id, or the
 * slugified name) to a shop. The Django resolver already implements the same
 * fallback chain the legacy version had.
 */
export async function getShopBySlugOrId(identifier: string): Promise<Shop | null> {
  try {
    const body = await getApiClient().get<unknown>(
      `${PUBLIC_SHOPS_PATH}${encodeURIComponent(identifier)}/`,
      { auth: false }
    );
    return fromApiShop(body);
  } catch (error) {
    // Callers treat "unknown shop" as null, exactly like the legacy version.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Storefront products: `publishToDirectory !== false`, no status filter. */
export async function getProductsByShop(shopId: string): Promise<Product[]> {
  const rows = await fetchAll<unknown>(
    `${PUBLIC_SHOPS_PATH}${encodeURIComponent(shopId)}/products/`,
    { page_size: MAX_PAGE_SIZE }
  );
  return rows.map(fromApiPublicProduct);
}

/** One line of a wishlist checkout, exactly as the modal builds it. */
export interface WishlistOrderItemInput {
  productId: string;
  productName?: string;
  quantity: number;
  /** Fallback price, honoured only when the product row no longer exists. */
  price: number;
}

export interface WishlistOrderInput {
  /** The ``ORD-######`` the modal generated; doubles as the idempotency key. */
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  paymentMethod?: string;
  customerType?: string;
  items: WishlistOrderItemInput[];
}

export interface StorefrontOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** The order as the server priced it; money fields are already numbers. */
export interface StorefrontOrder {
  id: string;
  orderId: string;
  shopId: string;
  status: string;
  source: string;
  subtotal: number;
  totalAmount: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerType?: string;
  notes?: string;
  createdAt?: string;
  items: StorefrontOrderItem[];
}

function fromApiStorefrontOrderItem(raw: unknown): StorefrontOrderItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: optionalString(row.productId),
    productName: stringOr(row.productName),
    quantity: numberOr(row.quantity, 1),
    unitPrice: numberOr(row.unitPrice, numberOr(row.price)),
    subtotal: numberOr(row.subtotal),
  };
}

export function fromApiStorefrontOrder(raw: unknown): StorefrontOrder {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    orderId: stringOr(row.orderId) || appVisibleId(row),
    shopId: stringOr(row.shopId),
    status: stringOr(row.status, "pending"),
    source: stringOr(row.source, "wishlist"),
    subtotal: numberOr(row.subtotal),
    totalAmount: numberOr(row.totalAmount),
    paymentMethod: optionalString(row.paymentMethod),
    customerName: optionalString(row.customerName),
    customerPhone: optionalString(row.customerPhone),
    customerAddress: optionalString(row.customerAddress),
    customerType: optionalString(row.customerType),
    notes: optionalString(row.notes),
    createdAt: optionalString(row.createdAt),
    items: Array.isArray(row.items) ? row.items.map(fromApiStorefrontOrderItem) : [],
  };
}

/**
 * Wishlist checkout: the legacy version appended to ``shops/{id}/orders``
 * anonymously, and this is that same write with the server re-pricing every
 * line from the product rows. The JWT rides along when a session exists so the
 * order lands in the shopper's portal history; guests post without a header.
 */
export async function placeWishlistOrder(
  shopId: string,
  input: WishlistOrderInput
): Promise<StorefrontOrder> {
  const body = await getApiClient().post<unknown>(
    `${PUBLIC_SHOPS_PATH}${encodeURIComponent(shopId)}/orders/`,
    input
  );
  return fromApiStorefrontOrder(body);
}

/**
 * Follow/unfollow, the only writes on the storefront surface. Requires a signed-in
 * user (the client attaches the JWT by default) and returns the new counter.
 */
export async function adjustFollowerCount(shopId: string, delta: 1 | -1): Promise<number> {
  const action = delta >= 0 ? "follow" : "unfollow";
  const body = await getApiClient().post<unknown>(
    `${PUBLIC_SHOPS_PATH}${encodeURIComponent(shopId)}/${action}/`
  );
  return numberOr(isRecord(body) ? body.followerCount : undefined, 0);
}
