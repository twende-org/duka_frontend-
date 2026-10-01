/**
 * Orders domain adapter for the strangler-fig cutover.
 *
 * `useOrders.ts` (and the pages behind it - Orders, Fulfillment, Dashboard,
 * Customers) used to read the legacy backend and call the `createOrder` service.
 * This module answers instead, so those files keep their old signatures. The
 * read mirrors the legacy `getOrders` (a shop's orders, every branch unless one
 * is named) and the writes mirror the behaviours the backend ported:
 *   - `createOrder` posts the wizard payload to the atomic B2B service
 *     (idempotency-key guarded, stock-checked) and resolves with the new order,
 *   - `payOrder` settles it: status ``paid``, day summary, shift drawer and
 *     customer lifetime stats - and, like before, no inventory movement,
 *   - `cancelOrder` rides ``update_status`` so the service-side restock and the
 *     credit-receivable reversal run,
 *   - `updateOrderFulfillmentStatus` merges fulfillment details, stamps the
 *     lifecycle timestamps and patches the picking rows.
 *
 * Ids: Django rows imported from the legacy backend carry a ``legacyId``; the app keeps
 * using it (it is what order documents and backlinks store), and only rows
 * created after the cutover expose the Django UUID. Every path below therefore
 * carries the app-visible id and lets the backend resolve it.
 */
import type { FulfillmentDetails, Order, OrderItem } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const ORDERS_PATH = "/api/v1/orders/";

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

/** legacyId first: it is the id every existing document and backlink uses. */
function appVisibleId(row: Record<string, unknown>): string {
  const legacy = stringOr(row.legacyId);
  return legacy || stringOr(row.id);
}

/**
 * Item lines are rendered with bare `.toLocaleString()` and keyed by
 * ``productId`` (the picking dialog, the receipt), so both must survive the
 * translation: DRF exposes the unit price as ``unitPrice`` and the legacy
 * spelling as ``price``.
 */
function toItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((row) => ({
    productId: stringOr(row.productId),
    productName: stringOr(row.productName),
    quantity: numberOr(row.quantity, 1),
    pickedQty: optionalNumber(row.pickedQty),
    price: numberOr(row.price ?? row.unitPrice),
    subtotal: numberOr(row.subtotal),
  }));
}

export function fromApiOrder(raw: unknown): Order {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    shopId: stringOr(row.shopId),
    branchId: optionalString(row.branchId),
    items: toItems(row.items),
    subtotal: numberOr(row.subtotal),
    tax: numberOr(row.tax),
    discount: numberOr(row.discount),
    totalAmount: numberOr(row.totalAmount),
    status: (stringOr(row.status) || "pending") as Order["status"],
    source: (row.source as Order["source"]) ?? undefined,
    approvalStatus: row.approvalStatus ? (row.approvalStatus as Order["approvalStatus"]) : undefined,
    fulfillment: isRecord(row.fulfillment) ? (row.fulfillment as FulfillmentDetails) : undefined,
    paymentMethod: optionalString(row.paymentMethod),
    customerName: optionalString(row.customerName),
    customerPhone: optionalString(row.customerPhone),
    customerId: optionalString(row.customerId) ?? null,
    customerType: optionalString(row.customerType),
    customerPoNumber: optionalString(row.customerPoNumber),
    requiredDeliveryDate: optionalString(row.requiredDeliveryDate),
    salespersonId: optionalString(row.salespersonId),
    internalNotes: optionalString(row.internalNotes),
    notes: optionalString(row.notes),
    profitEstimate: optionalNumber(row.profitEstimate),
    //: DRF renders datetimes as ISO strings; the pages already accept both
    //: shapes (they check for a ``toDate()`` object first).
    createdAt: (row.createdAt as Order["createdAt"]) ?? undefined,
    paidAt: (row.paidAt as Order["paidAt"]) ?? undefined,
    idempotencyKey: optionalString(row.idempotencyKey),
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

/** Walk DRF's page links to honour the old "getOrders returned everything" contract. */
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

/** All of the shop's orders, newest first server-side. */
export async function getOrders(shopId: string, branchId?: string): Promise<Order[]> {
  const query: Record<string, string | number> = { shop_id: shopId, page_size: MAX_PAGE_SIZE };
  if (branchId) query.branch_id = branchId;
  const rows = await fetchAll<unknown>(ORDERS_PATH, query);
  return rows.map(fromApiOrder);
}

/**
 * The shell's badge: how many of the shop's orders are still ``pending``.
 * Reads DRF's ``count`` off a one-row page instead of downloading the rows.
 */
export async function countPendingOrders(shopId: string): Promise<number> {
  const body = await getApiClient().get<Record<string, unknown>>(ORDERS_PATH, {
    query: { shop_id: shopId, status: "pending", page_size: 1 },
  });
  return numberOr(body?.count);
}

/**
 * The legacy createOrder function, now the Django B2B service: the
 * payload is the wizard's own camelCase shape, and the response is the created
 * row (``orderId`` included) so callers keep reading ``id``.
 */
export async function createOrder(
  shopId: string,
  data: Omit<Order, "id"> & { idempotencyKey?: string }
): Promise<Order> {
  const created = await getApiClient().post<unknown>(ORDERS_PATH, toApiPayload({ ...data, shopId }));
  return fromApiOrder(created);
}

/**
 * The legacy payOrder: settles the order without moving inventory. ``shiftId``
 * is a Django shift UUID, and the endpoint
 * rejects unknown ids, so callers only send one they fetched from the API.
 */
export async function payOrder(
  shopId: string,
  orderId: string,
  paymentMethod: string,
  shiftId?: string
): Promise<void> {
  await getApiClient().post<unknown>(
    `${ORDERS_PATH}${encodeURIComponent(orderId)}/pay/`,
    toApiPayload({ paymentMethod, shiftId })
  );
}

/**
 * The legacy cancelOrder; the backend also restocks the branch and reverses
 * the credit receivable, which is why the hook refreshes inventory too.
 */
export async function cancelOrder(shopId: string, orderId: string): Promise<void> {
  await getApiClient().patch<unknown>(
    `${ORDERS_PATH}${encodeURIComponent(orderId)}/update_status/`,
    { status: "cancelled" }
  );
}

export async function deleteOrder(shopId: string, orderId: string): Promise<void> {
  await getApiClient().del<unknown>(`${ORDERS_PATH}${encodeURIComponent(orderId)}/`);
}

export async function updateOrderFulfillmentStatus(
  shopId: string,
  orderId: string,
  status: Order["status"],
  fulfillmentData?: Partial<FulfillmentDetails>,
  items?: OrderItem[]
): Promise<void> {
  await getApiClient().patch<unknown>(
    `${ORDERS_PATH}${encodeURIComponent(orderId)}/update_status/`,
    toApiPayload({
      status,
      fulfillmentData,
      // PickingDialog patches every line by the product it belongs to and sends
      // no row id; the endpoint accepts exactly this shape.
      items: items?.map((item) => toApiPayload({ productId: item.productId, pickedQty: item.pickedQty })),
    })
  );
}
