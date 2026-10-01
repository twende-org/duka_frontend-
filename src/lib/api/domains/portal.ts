/**
 * Customer-portal domain adapter for the strangler-fig cutover.
 *
 * The portal pages (CustomerOrders, CustomerReceipts, CustomerHome) keep calling
 * `getCustomerOrders(userId)` / `getCustomerReceipts(userId)`. When
 * the "portal" domain is cut over, Django answers for the bearer of the JWT:
 * "which rows are mine" is resolved server-side from the uid bridge
 * (apps.sales.selectors), so the `userId` argument is kept only for signature
 * parity and otherwise ignored.
 *
 * The endpoints return the same field names as the documents the pages
 * were written against, and render money as JSON numbers (coerce_to_string=False
 * in api/v1/serializers/portal.py); the translations below still normalize
 * defensively so a future serializer change cannot hand the pages strings where
 * they expect numbers.
 */
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const PORTAL_ORDERS_PATH = "/api/v1/portal/orders/";
const PORTAL_RECEIPTS_PATH = "/api/v1/portal/receipts/";

/** DRF's max_page_size; the pages render whole lists and counts, not pages. */
const MAX_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link: 100 * 200 orders is far past any customer. */
const MAX_PAGES = 100;

export interface PortalItem {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface PortalOrder {
  id: string;
  orderId: string;
  shopId: string;
  shopName: string;
  createdAt?: string;
  totalAmount: number;
  status: string;
  source?: string;
  fulfillment?: Record<string, unknown>;
  items: PortalItem[];
}

export interface PortalReceipt {
  id: string;
  shopId: string;
  shopName: string;
  date: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
  items: PortalItem[];
  createdAt?: string;
}

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

/** Item lines are rendered with bare `.toLocaleString()`, so they must be numbers. */
function toItems(value: unknown): PortalItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = isRecord(entry) ? entry : {};
    return {
      productId: optionalString(row.productId),
      productName: stringOr(row.productName),
      quantity: numberOr(row.quantity, 1),
      price: numberOr(row.price),
      subtotal: numberOr(row.subtotal),
    };
  });
}

export function fromApiPortalOrder(raw: unknown): PortalOrder {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    orderId: stringOr(row.orderId),
    shopId: stringOr(row.shopId),
    shopName: stringOr(row.shopName),
    createdAt: optionalString(row.createdAt),
    totalAmount: numberOr(row.totalAmount),
    status: stringOr(row.status, "pending"),
    source: optionalString(row.source),
    fulfillment: isRecord(row.fulfillment) ? row.fulfillment : undefined,
    items: toItems(row.items),
  };
}

export function fromApiPortalReceipt(raw: unknown): PortalReceipt {
  const row = isRecord(raw) ? raw : {};
  const items = toItems(row.items);
  return {
    id: stringOr(row.id),
    shopId: stringOr(row.shopId),
    shopName: stringOr(row.shopName),
    date: stringOr(row.date),
    total: numberOr(row.total),
    paymentMethod: stringOr(row.paymentMethod),
    itemsCount: numberOr(row.itemsCount, items.length),
    items,
    createdAt: optionalString(row.createdAt),
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

/**
 * Walk DRF's page links. Unlike the storefront reads these are authenticated:
 * the bridge attaches the API JWT (../token.ts), which
 * is also what makes the server-side identity resolution see the caller.
 */
async function fetchAll<T>(path: string): Promise<T[]> {
  const client = getApiClient();
  const collected: T[] = [];
  let nextPath: string | null = path;
  let nextQuery: Record<string, string | number> | undefined = { page_size: MAX_PAGE_SIZE };
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<T>>(nextPath, { query: nextQuery });
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** The caller's orders, newest first. */
export async function getCustomerOrders(_userId: string): Promise<PortalOrder[]> {
  const rows = await fetchAll<unknown>(PORTAL_ORDERS_PATH);
  return rows.map(fromApiPortalOrder);
}

/** The caller's completed sales as receipts. */
export async function getCustomerReceipts(_userId: string): Promise<PortalReceipt[]> {
  const rows = await fetchAll<unknown>(PORTAL_RECEIPTS_PATH);
  return rows.map(fromApiPortalReceipt);
}
