/**
 * Products + merchant-categories domain adapter for the strangler-fig cutover.
 *
 * The app keeps calling the same functions it called before, so pages, Redux
 * thunks and hooks stay untouched. This module translates:
 *   - DRF payloads to the app's camelCase Product / MerchantCategory shape,
 *   - the legacy limit/startAfter pagination to DRF page numbers.
 *
 * Ids: Django rows imported from the legacy backend carry a `legacyId`; the app keeps
 * using it (it is what shop/product documents and backlinks store), and only
 * rows created after the cutover expose the Django UUID.
 */
import type { MerchantCategory, PricingRecord, Product } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const PRODUCTS_PATH = "/api/v1/products/";
const MERCHANT_CATEGORIES_PATH = "/api/v1/merchant-categories/";

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

/** The legacy backend held prices as numbers; DRF JSONB may still carry decimal strings. */
function pricesOr(value: unknown): PricingRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row) => ({
    type: stringOr(row.type),
    price: numberOr(row.price),
  }));
}

/** legacyId first: it is the id every existing document and backlink uses. */
function appVisibleId(row: Record<string, unknown>): string {
  const legacy = stringOr(row.legacyId);
  return legacy || stringOr(row.id);
}

export function fromApiProduct(raw: unknown): Product {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    name: stringOr(row.name),
    category: optionalString(row.category),
    categories: Array.isArray(row.categories) ? row.categories.filter((c): c is string => typeof c === "string") : [],
    marketplaceCategoryId: optionalString(row.marketplaceCategoryId),
    merchantCategoryId: optionalString(row.merchantCategoryId),
    condition: (row.condition as Product["condition"]) ?? undefined,
    attributes: isRecord(row.attributes) ? (row.attributes as Record<string, string>) : undefined,
    variants: Array.isArray(row.variants) ? (row.variants as Product["variants"]) : undefined,
    buyingPrice: numberOr(row.buyingPrice),
    sellingPrice: numberOr(row.sellingPrice),
    prices: pricesOr(row.prices),
    wholesalePrice: optionalNumber(row.wholesalePrice),
    moq: optionalNumber(row.moq),
    supplier: stringOr(row.supplier),
    shopId: stringOr(row.shopId),
    branchId: optionalString(row.branchId),
    sku: optionalString(row.sku),
    barcode: optionalString(row.barcode),
    brand: optionalString(row.brand),
    description: optionalString(row.description),
    unit: optionalString(row.unit),
    weight: optionalString(row.weight),
    size: optionalString(row.size),
    color: optionalString(row.color),
    expiryDate: optionalString(row.expiryDate),
    imageUrl: optionalString(row.imageUrl),
    imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls.filter((u): u is string => typeof u === "string") : [],
    publishToFacebook: Boolean(row.publishToFacebook),
    publishToDirectory: Boolean(row.publishToDirectory),
    publishToDeliveryApp: Boolean(row.publishToDeliveryApp),
    rating: optionalNumber(row.rating),
    reviewCount: optionalNumber(row.reviewCount),
    status: (row.status as Product["status"]) ?? undefined,
    // The legacy backend stored '' when the form left tags untouched; [] renders the same.
    tags: Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === "string")
      : typeof row.tags === "string" && row.tags.trim() !== ""
        ? [row.tags]
        : [],
    warranty: optionalString(row.warranty),
    discount: optionalNumber(row.discount),
    taxRate: optionalNumber(row.taxRate),
    storeLocation: optionalString(row.storeLocation),
    createdAt: row.createdAt as Product["createdAt"],
    updatedAt: row.updatedAt as Product["updatedAt"],
    sourceProductId: optionalString(row.sourceProductId),
    supplierShopId: optionalString(row.supplierShopId),
  };
}

export function fromApiMerchantCategory(raw: unknown): MerchantCategory {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    shopId: stringOr(row.shopId),
    name: stringOr(row.name),
    slug: stringOr(row.slug),
    description: optionalString(row.description),
    sortOrder: optionalNumber(row.sortOrder) ?? optionalNumber(row.sort_order) ?? 0,
    rating: optionalNumber(row.rating),
    reviewCount: optionalNumber(row.reviewCount),
    status: (row.status as MerchantCategory["status"]) ?? undefined,
    parentId: optionalString(row.parentId),
  };
}

/**
 * The API accepts the app's camelCase payload directly (the serializers declare
 * camelCase aliases), and ignores the read-only extras it carries; only
 * `undefined` is dropped so an untouched field is never sent as null.
 */
function toApiPayload(data: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
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

/** Walk DRF's page links to honour the old "getProducts returned everything" contract. */
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

export async function getProducts(shopId: string): Promise<Product[]> {
  const rows = await fetchAll<unknown>(PRODUCTS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiProduct);
}

/**
 * Same contract as the legacy version: `lastDoc` is an opaque cursor the
 * caller passes back on the next page. Here it is the DRF page number.
 */
export async function getProductsPaginated(
  shopId: string,
  pageSize: number = 20,
  lastVisibleDoc?: unknown
): Promise<{ products: Product[]; lastDoc: number; hasMore: boolean }> {
  const previousPage =
    typeof lastVisibleDoc === "number" && Number.isFinite(lastVisibleDoc) && lastVisibleDoc > 0
      ? lastVisibleDoc
      : 0;
  const page = previousPage + 1;
  const body = await getApiClient().get<DrfPage<unknown>>(PRODUCTS_PATH, {
    query: { shop_id: shopId, page, page_size: Math.max(1, Math.floor(pageSize) || 20) },
  });
  return {
    products: unwrapList<unknown>(body).map(fromApiProduct),
    lastDoc: page,
    hasMore: Boolean(body?.next),
  };
}

export async function addProduct(data: Omit<Product, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(PRODUCTS_PATH, toApiPayload(data));
  return fromApiProduct(created).id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await getApiClient().patch<unknown>(`${PRODUCTS_PATH}${encodeURIComponent(id)}/`, toApiPayload(data));
}

export async function deleteProduct(id: string): Promise<void> {
  await getApiClient().del<unknown>(`${PRODUCTS_PATH}${encodeURIComponent(id)}/`);
}

export interface BulkImportRow {
  name?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  unit?: string;
  buyingPrice?: string;
  sellingPrice?: string;
  quantity?: string;
}

export interface BulkImportResult {
  row: number;
  name: string;
  status: "created" | "updated" | "error";
  message?: string;
  productId?: string;
}

export interface BulkImportSummary {
  total: number;
  created: number;
  updated: number;
  errors: number;
  stockChanges: number;
}

export async function bulkImportProducts(
  shopId: string,
  rows: BulkImportRow[],
  branchId?: string | null
): Promise<{ summary: BulkImportSummary; results: BulkImportResult[] }> {
  return getApiClient().post<{ summary: BulkImportSummary; results: BulkImportResult[] }>(
    `${PRODUCTS_PATH}bulk_import/`,
    toApiPayload({ shopId, branchId: branchId || undefined, rows })
  );
}

export async function getMerchantCategories(shopId: string): Promise<MerchantCategory[]> {
  const rows = await fetchAll<unknown>(MERCHANT_CATEGORIES_PATH, {
    shop_id: shopId,
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiMerchantCategory);
}

export async function addMerchantCategory(
  shopId: string,
  data: Omit<MerchantCategory, "id">
): Promise<MerchantCategory> {
  const created = await getApiClient().post<unknown>(
    MERCHANT_CATEGORIES_PATH,
    toApiPayload({ ...data, shopId: data.shopId || shopId })
  );
  return fromApiMerchantCategory(created);
}

export async function deleteMerchantCategory(shopId: string, categoryId: string): Promise<void> {
  await getApiClient().del<unknown>(`${MERCHANT_CATEGORIES_PATH}${encodeURIComponent(categoryId)}/`);
}
