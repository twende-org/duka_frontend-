/**
 * Sales + POS domain adapter for the strangler-fig cutover.
 *
 * `useSales.ts`, `salesSlice.ts` and `CommerceEngine.ts` keep calling the same
 * functions they called before, so `Sales.tsx`
 * and the dashboards stay untouched. This module translates:
 *   - DRF sale rows back to the app's `Sale` shape. The legacy store kept the cart as
 *     one flat row (`productId`/`productName`/`quantity`); Django keeps the cart
 *     lines, so those flat fields are re-derived from `items` the way the POS
 *     built them (`"Foo +2"` for multi-line sales),
 *   - the app's cart payload to the backend's POS input (camelCase keys, the
 *     discounted `subtotal` as the line total),
 *   - drafts: `addDraftSale` posts the same endpoint with `status: "draft"`,
 *   - DRF's page links to the old "returned everything" contract.
 */
import type { DailySalesSummary, OrderItem, Sale } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const SALES_PATH = "/api/v1/sales/";
const SUMMARIES_PATH = "/api/v1/sales/summaries/";

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

/** A foreign-key id, whether the serializer inlined it or sent the app-visible id. */
function refId(value: unknown): string {
  if (isRecord(value)) return stringOr(value.legacyId) || stringOr(value.id);
  return stringOr(value);
}

/** legacyId first: it is the id every existing document and backlink uses. */
function appVisibleId(row: Record<string, unknown>): string {
  return stringOr(row.legacyId) || stringOr(row.id);
}

export function fromApiSaleItem(raw: unknown): OrderItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: refId(row.productId),
    productName: stringOr(row.productName),
    quantity: numberOr(row.quantity, 1),
    // `price` is the list selling price, `subtotal` the discounted line total.
    price: numberOr(row.price ?? row.unitPrice),
    subtotal: numberOr(row.subtotal ?? row.totalPrice),
  };
}

export function fromApiSale(raw: unknown): Sale {
  const row = isRecord(raw) ? raw : {};
  const items = Array.isArray(row.items) ? row.items.filter(isRecord).map(fromApiSaleItem) : [];
  const first = items[0];
  // The POS flattened the cart onto the sale: "Name +2" for multi-line carts.
  const productName = first
    ? items.length > 1
      ? `${first.productName} +${items.length - 1}`
      : first.productName
    : "";
  return {
    id: appVisibleId(row),
    productId: first?.productId ?? "",
    productName,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: numberOr(row.totalPrice ?? row.totalAmount),
    paymentMethod: stringOr(row.paymentMethod, "Taslimu"),
    date: stringOr(row.date),
    shopId: refId(row.shopId),
    shopName: optionalString(row.shopName),
    branchId: optionalString(refId(row.branchId)),
    customerName: optionalString(row.customerName),
    customerPhone: optionalString(row.customerPhone),
    customerId: optionalString(row.customerId),
    notes: optionalString(row.notes),
    status: row.status === "draft" ? "draft" : "completed",
    createdBy: optionalString(refId(row.createdBy)),
    createdByName: optionalString(row.createdByName),
    items: items.length > 0 ? items : undefined,
    shiftId: optionalString(refId(row.shiftId)),
  };
}

export function fromApiSummary(raw: unknown): DailySalesSummary {
  const row = isRecord(raw) ? raw : {};
  return {
    date: stringOr(row.date),
    totalSales: numberOr(row.totalSales ?? row.total_sales),
    transactions: numberOr(row.transactions),
    profit: numberOr(row.profit),
    totalExpenses: numberOr(row.totalExpenses ?? row.total_expenses),
    netProfit: numberOr(row.netProfit ?? row.net_profit),
  };
}

/**
 * The legacy flat row plus the cart lines; payments the app's pickers send
 * ("Taslimu", "M-Pesa") are accepted by the backend's slug normalizer.
 */
function toSalePayload(data: Omit<Sale, "id">, status: "completed" | "draft"): Record<string, unknown> {
  const items =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            productId: data.productId,
            productName: data.productName,
            quantity: data.quantity,
            price: data.totalPrice / (data.quantity || 1),
            subtotal: data.totalPrice,
          },
        ];
  const payload: Record<string, unknown> = {
    shopId: data.shopId,
    paymentMethod: data.paymentMethod,
    status,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
  };
  if (data.branchId) payload.branchId = data.branchId;
  if (data.customerId) payload.customerId = data.customerId;
  if (data.customerName) payload.customerName = data.customerName;
  if (data.customerPhone) payload.customerPhone = data.customerPhone;
  if (data.notes) payload.notes = data.notes;
  if (data.shiftId) payload.shiftId = data.shiftId;
  if (data.buyerShopId) payload.buyerShopId = data.buyerShopId;
  return payload;
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

/** Walk DRF's page links to honour the old "getSalesByDate returned everything" contract. */
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

export async function getSalesByDate(shopId: string, dateStr: string, branchId?: string): Promise<Sale[]> {
  const query: Record<string, string | number> = {
    shop_id: shopId,
    date: dateStr,
    page_size: MAX_PAGE_SIZE,
  };
  if (branchId) query.branch_id = branchId;
  const rows = await fetchAll<unknown>(SALES_PATH, query);
  return rows.map(fromApiSale);
}

export async function getSalesForRange(
  shopId: string,
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<Sale[]> {
  const query: Record<string, string | number> = {
    shop_id: shopId,
    date_from: startDate,
    date_to: endDate,
    page_size: MAX_PAGE_SIZE,
  };
  if (branchId) query.branch_id = branchId;
  const rows = await fetchAll<unknown>(SALES_PATH, query);
  return rows.map(fromApiSale);
}

/** One day's totals; `null` when the shop never traded that day. */
export async function getDailySummary(shopId: string, dateStr: string): Promise<DailySalesSummary | null> {
  const body = await getApiClient().get<unknown>(SUMMARIES_PATH, {
    query: { shop_id: shopId, date: dateStr },
  });
  const row = unwrapList<unknown>(body)[0];
  return row ? fromApiSummary(row) : null;
}

export async function getSummariesForRange(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<DailySalesSummary[]> {
  const body = await getApiClient().get<unknown>(SUMMARIES_PATH, {
    query: { shop_id: shopId, date_from: startDate, date_to: endDate },
  });
  return unwrapList<unknown>(body).map(fromApiSummary);
}

/**
 * Same contract as the legacy version: sale + daily summary + stock in one
 * atomic write. `profit` is no longer sent — the backend recomputes it from the
 * discounted lines and the products' buying prices.
 */
export async function addSaleWithSummary(data: Omit<Sale, "id">, _profit: number): Promise<string> {
  const created = await getApiClient().post<unknown>(SALES_PATH, toSalePayload(data, "completed"));
  return appVisibleId(isRecord(created) ? created : {});
}

export async function addDraftSale(data: Omit<Sale, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(SALES_PATH, toSalePayload(data, "draft"));
  return appVisibleId(isRecord(created) ? created : {});
}

/** Completes a draft: stock, movements and the day summary move server-side. */
export async function confirmDraftSale(
  _shopId: string,
  _date: string,
  saleId: string,
  _profit: number
): Promise<void> {
  await getApiClient().post<unknown>(`${SALES_PATH}${encodeURIComponent(saleId)}/confirm/`, {});
}

export async function deleteDraftSale(_shopId: string, _date: string, saleId: string): Promise<void> {
  await getApiClient().del<unknown>(`${SALES_PATH}${encodeURIComponent(saleId)}/`);
}
