/**
 * Shared master catalog (tap-to-add) and per-unit IMEI tracking.
 *
 * Endpoints, as the Django backend actually serves them:
 *   GET  /api/v1/master-products/?shop_id&q&category&brand&niche&page&page_size
 *   POST /api/v1/products/tap-to-add/
 *   GET  /api/v1/products/{productId}/serials/?unitStatus&page&page_size
 *   POST /api/v1/products/{productId}/serials/
 *
 * Reads filter by `shop_id` (snake_case), writes carry `shopId` in the body —
 * the same split every other domain module uses. The catalog itself belongs to
 * no shop: `shopId` only annotates each row with `alreadyAdded`.
 */
import type { MasterCatalogProduct, Product, ProductSerial, ProductSerialStatus } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";
import { fromApiProduct } from "./products";

const MASTER_PRODUCTS_PATH = "/api/v1/master-products/";
const TAP_TO_ADD_PATH = "/api/v1/products/tap-to-add/";
const PRODUCTS_PATH = "/api/v1/products/";

/** Picker page: the backend's own catalog page size, overridable by callers. */
const CATALOG_PAGE_SIZE = 24;
/** Serial lists are read whole: a phone shop needs every device on the shelf. */
const SERIALS_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link. */
const MAX_PAGES = 50;

interface DrfPage<T> {
  count?: number;
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

function booleanOr(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** legacyId first: it is the id every existing document and backlink uses. */
function appVisibleId(row: Record<string, unknown>): string {
  return stringOr(row.legacyId) || stringOr(row.id);
}

/** A foreign-key id, whether the serializer inlined it or sent the app-visible id. */
function refId(value: unknown): string {
  if (isRecord(value)) return stringOr(value.legacyId) || stringOr(value.id);
  return stringOr(value);
}

const SERIAL_STATUSES: ProductSerialStatus[] = [
  "in_stock",
  "sold",
  "reserved",
  "returned",
  "damaged",
];

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

export function fromApiMasterProduct(raw: unknown): MasterCatalogProduct {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    name: stringOr(row.name),
    brand: stringOr(row.brand),
    categoryName: stringOr(row.categoryName),
    niche: stringOr(row.niche, "electronics"),
    barcode: optionalString(row.barcode),
    imageUrl: optionalString(row.imageUrl),
    defaultWarranty: optionalString(row.defaultWarranty),
    requiresImei: booleanOr(row.requiresImei),
    attributes: isRecord(row.attributes) ? (row.attributes as Record<string, string>) : undefined,
    isVerified: booleanOr(row.isVerified, true),
    isActive: booleanOr(row.isActive, true),
    alreadyAdded: booleanOr(row.alreadyAdded),
    createdAt: row.createdAt as MasterCatalogProduct["createdAt"],
    updatedAt: row.updatedAt as MasterCatalogProduct["updatedAt"],
  };
}

export function fromApiSerial(raw: unknown): ProductSerial {
  const row = isRecord(raw) ? raw : {};
  const status = stringOr(row.status, "in_stock");
  return {
    id: appVisibleId(row),
    shopId: refId(row.shopId),
    productId: refId(row.productId),
    branchId: optionalString(refId(row.branchId)),
    imeiNumber: stringOr(row.imeiNumber),
    serialNumber: stringOr(row.serialNumber),
    status: SERIAL_STATUSES.includes(status as ProductSerialStatus)
      ? (status as ProductSerialStatus)
      : "in_stock",
    saleItemId: optionalString(row.saleItemId),
    notes: optionalString(row.notes),
    createdAt: row.createdAt as ProductSerial["createdAt"],
    updatedAt: row.updatedAt as ProductSerial["updatedAt"],
  };
}

export interface MasterCatalogSearchParams {
  shopId: string;
  q?: string;
  category?: string;
  brand?: string;
  /** One lane, exactly as the backend's single-value filter has always worked. */
  niche?: string;
  /** The merchant's catalog lanes; the backend falls back to all when a lane
   *  has no seeded rows yet. */
  niches?: string[];
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface MasterCatalogPage {
  products: MasterCatalogProduct[];
  count: number;
  /** Page number for the next call, or null once the catalog is exhausted. */
  nextPage: number | null;
}

/**
 * One picker page. `shopId` does not filter rows — it annotates them with
 * `alreadyAdded`, so the merchant never taps a device twice.
 */
export async function searchMasterCatalog(
  params: MasterCatalogSearchParams
): Promise<MasterCatalogPage> {
  const page = Math.max(1, Math.floor(params.page || 1));
  const body = await getApiClient().get<DrfPage<unknown>>(MASTER_PRODUCTS_PATH, {
    query: {
      shop_id: params.shopId,
      q: params.q?.trim() || undefined,
      category: params.category || undefined,
      brand: params.brand || undefined,
      niche: params.niche || undefined,
      niches: params.niches?.length ? params.niches.join(",") : undefined,
      page,
      page_size: params.pageSize ?? CATALOG_PAGE_SIZE,
    },
    signal: params.signal,
  });
  const results = unwrapList<unknown>(body).map(fromApiMasterProduct);
  return {
    products: results,
    count: typeof body?.count === "number" ? body.count : results.length,
    nextPage: body?.next ? page + 1 : null,
  };
}

export interface TapToAddLine {
  masterProductId: string;
  buyingPrice?: number;
  sellingPrice?: number;
  wholesalePrice?: number;
  /** Omit when `imeiNumbers` carry the count: one scanned device is one unit. */
  quantity?: number;
  publishToDirectory?: boolean;
  imeiNumbers?: string[];
}

/** Keys are dropped when untouched, so a restock tap never zeroes a margin. */
function toTapToAddItem(line: TapToAddLine): Record<string, unknown> {
  const item: Record<string, unknown> = { masterProductId: line.masterProductId };
  if (line.buyingPrice !== undefined) item.buyingPrice = line.buyingPrice;
  if (line.sellingPrice !== undefined) item.sellingPrice = line.sellingPrice;
  if (line.wholesalePrice !== undefined) item.wholesalePrice = line.wholesalePrice;
  if (line.quantity !== undefined) item.quantity = line.quantity;
  if (line.publishToDirectory !== undefined) item.publishToDirectory = line.publishToDirectory;
  if (line.imeiNumbers?.length) item.imeiNumbers = line.imeiNumbers;
  return item;
}

/**
 * Adds the whole selection in one call. The backend wraps the batch in a
 * transaction, so a rejected line leaves the shop exactly as it was and the
 * merchant gets one clean error instead of a half-built shelf.
 */
export async function tapToAddProducts(input: {
  shopId: string;
  branchId?: string | null;
  items: TapToAddLine[];
}): Promise<Product[]> {
  const body = await getApiClient().post<{ products?: unknown }>(
    TAP_TO_ADD_PATH,
    {
      shopId: input.shopId,
      branchId: input.branchId || undefined,
      items: input.items.map(toTapToAddItem),
    }
  );
  const rows = Array.isArray(body?.products) ? body.products : [];
  return rows.map(fromApiProduct);
}

/** Every in-stock unit of one product, walking DRF's page links. */
export async function getProductSerials(
  productId: string,
  options: { unitStatus?: ProductSerialStatus; signal?: AbortSignal } = {}
): Promise<ProductSerial[]> {
  const client = getApiClient();
  const collected: ProductSerial[] = [];
  let nextPath: string | null = `${PRODUCTS_PATH}${encodeURIComponent(productId)}/serials/`;
  let nextQuery: Record<string, string | number> | undefined = {
    page_size: SERIALS_PAGE_SIZE,
    ...(options.unitStatus ? { unitStatus: options.unitStatus } : {}),
  };
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(nextPath, {
      query: nextQuery,
      signal: options.signal,
    });
    collected.push(...unwrapList<unknown>(body).map(fromApiSerial));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/**
 * Registers scanned units against an existing product — a wholesaler delivery,
 * a trade-in. `addToStock` raises `Inventory` by the same count unless turned
 * off, which is why the default is true.
 */
export async function addProductSerials(
  productId: string,
  input: { imeiNumbers: string[]; branchId?: string | null; addToStock?: boolean }
): Promise<ProductSerial[]> {
  const body = await getApiClient().post<unknown>(
    `${PRODUCTS_PATH}${encodeURIComponent(productId)}/serials/`,
    {
      imeiNumbers: input.imeiNumbers,
      branchId: input.branchId || undefined,
      addToStock: input.addToStock ?? true,
    }
  );
  return unwrapList<unknown>(body).map(fromApiSerial);
}

/**
 * Strips separators, collapses repeats, keeps input order — the same rules
 * `clean_imeis` applies server-side, so what the merchant sees counted is what
 * the backend counts.
 */
export function parseImeiInput(raw: string): string[] {
  const seen: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const imei = token.trim();
    if (imei && !seen.includes(imei)) seen.push(imei);
  }
  return seen;
}
