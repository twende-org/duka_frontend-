/**
 * Inventory domain adapter for the strangler-fig cutover.
 *
 * `useInventory.ts` and `inventorySlice.ts` keep calling the same functions they
 * called on the legacy backend, so `Inventory.tsx`,
 * `Products.tsx` and `ShareSoldOutDialog.tsx` stay untouched. This module
 * translates:
 *   - DRF stock rows to the app's `Stock` shape (the legacy store keyed the row by
 *     product id, so `id === productId`),
 *   - the app's `(type, quantity)` adjust payload to the backend's signed
 *     `quantityChange`,
 *   - DRF's newest-first movement pages back to the oldest-first list the page
 *     reverses for display.
 */
import type { Stock, StockMovement } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const INVENTORY_PATH = "/api/v1/inventory/";
const MOVEMENTS_PATH = "/api/v1/inventory-movements/";

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

function toType(value: unknown): StockMovement["type"] {
  return value === "out" || value === "transfer" || value === "sale" || value === "adjustment"
    ? value
    : "in";
}

export function fromApiStock(raw: unknown): Stock {
  const row = isRecord(raw) ? raw : {};
  const productId = refId(row.productId);
  return {
    // The row used to live at shops/{shopId}/inventory/{productId}.
    id: productId,
    productId,
    shopId: refId(row.shopId),
    branchId: optionalString(refId(row.branchId)),
    quantity: numberOr(row.quantity),
    minStock: optionalNumber(row.minStock) ?? 5,
    location: optionalString(row.location),
    allocatedQty: optionalNumber(row.allocatedQty) ?? 0,
    lastUpdated: (row.lastUpdated ?? row.updatedAt) as Stock["lastUpdated"],
  };
}

export function fromApiMovement(raw: unknown): StockMovement {
  const row = isRecord(raw) ? raw : {};
  const delta = optionalNumber(row.quantityChanged) ?? numberOr(row.quantity);
  return {
    id: stringOr(row.id),
    productId: refId(row.productId),
    productName: stringOr(row.productName),
    shopId: refId(row.shopId),
    branchId: optionalString(refId(row.branchId)),
    type: toType(row.type),
    // The backend stores the signed delta; the history list prints the sign
    // from `type` and expects the magnitude here (as the legacy store did).
    quantity: Math.abs(delta),
    previousQty: optionalNumber(row.previousQty),
    newQty: optionalNumber(row.newQty),
    reason: optionalString(row.reason),
    date: (row.date ?? row.createdAt) as StockMovement["date"],
    userId: refId(row.userId),
    userName: optionalString(row.userName),
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

/** Walk DRF's page links to honour the old "getInventory returned everything" contract. */
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

export async function getInventory(shopId: string, branchId?: string): Promise<Stock[]> {
  const query: Record<string, string | number> = { shop_id: shopId, page_size: MAX_PAGE_SIZE };
  if (branchId) query.branch_id = branchId;
  const rows = await fetchAll<unknown>(INVENTORY_PATH, query);
  return rows.map(fromApiStock);
}

export async function getStockMovements(shopId: string, productId?: string): Promise<StockMovement[]> {
  const query: Record<string, string | number> = { shop_id: shopId, page_size: MAX_PAGE_SIZE };
  if (productId) query.product_id = productId;
  const rows = await fetchAll<unknown>(MOVEMENTS_PATH, query);
  // The server pages newest-first; `Inventory.tsx` reverses the list to show
  // the latest movement on top, so hand it back oldest-first.
  return rows.map(fromApiMovement).reverse();
}

/** `in` adds, `out`/`sale` subtract, `adjustment`/`transfer` carry their own sign. */
function signedDelta(type: StockMovement["type"], quantity: number): number {
  return type === "out" || type === "sale" ? -quantity : quantity;
}

/**
 * Same contract as the legacy version: `data` is the movement the caller
 * wants recorded, with `quantity` as a magnitude for in/out/sale.
 */
export async function adjustStock(data: Omit<StockMovement, "id">): Promise<void> {
  const payload: Record<string, unknown> = {
    productId: data.productId,
    movementType: data.type,
    quantity: signedDelta(data.type, numberOr(data.quantity)),
    reason: data.reason ?? "",
  };
  if (data.branchId) payload.branchId = data.branchId;
  await getApiClient().post<unknown>(`${MOVEMENTS_PATH}adjust/`, payload);
}

/**
 * The legacy store updated the row keyed by product id; here the row carries its own
 * id, so read it first and patch it by that id.
 */
export async function updateStockMinLevel(
  shopId: string,
  productId: string,
  minStock: number,
  branchId?: string
): Promise<void> {
  const query: Record<string, string | number> = {
    shop_id: shopId,
    product_id: productId,
    page_size: 1,
  };
  if (branchId) query.branch_id = branchId;
  const body = await getApiClient().get<unknown>(INVENTORY_PATH, { query });
  const row = unwrapList<Record<string, unknown>>(body)[0];
  const id = row ? stringOr(row.id) : "";
  if (!id) throw new Error("No stock row for this product yet.");
  await getApiClient().patch<unknown>(`${INVENTORY_PATH}${encodeURIComponent(id)}/`, { minStock });
}
