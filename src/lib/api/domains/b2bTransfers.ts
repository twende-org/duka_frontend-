/**
 * B2B wholesaler → retailer stock transfer adapter (Twende Duka Part 2).
 *
 * Stock leaves the sender the moment a transfer is created; the retailer sees
 * it as a pending card and confirms via `completeStockTransfer`, which moves
 * the quarantine into their live inventory server-side.
 */
import type { B2BTransfer, B2BTransferInput } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const TRANSFERS_PATH = "/api/v1/transfers/";

const STATUSES = new Set(["pending", "completed", "cancelled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function fromApiB2BTransfer(raw: unknown): B2BTransfer {
  const row = isRecord(raw) ? raw : {};
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: stringOr(row.id),
    fromShopId: stringOr(row.fromShopId),
    toShopId: stringOr(row.toShopId),
    fromBranchId: stringOr(row.fromBranchId),
    toBranchId: optionalString(row.toBranchId),
    status: STATUSES.has(stringOr(row.status)) ? (row.status as B2BTransfer["status"]) : "pending",
    source: stringOr(row.source) === "sale" ? "sale" : "manual",
    reference: stringOr(row.reference),
    note: stringOr(row.note),
    createdById: optionalString(row.createdById),
    completedById: optionalString(row.completedById),
    completedAt: typeof row.completedAt === "string" ? row.completedAt : null,
    items: rawItems.map((item) => {
      const line = isRecord(item) ? item : {};
      return {
        id: stringOr(line.id),
        productId: stringOr(line.productId),
        productName: stringOr(line.productName),
        sku: stringOr(line.sku),
        barcode: stringOr(line.barcode),
        unit: stringOr(line.unit) || "pcs",
        quantity: numberOr(line.quantity),
        unitCost: numberOr(line.unitCost),
        receivedProductId: typeof line.receivedProductId === "string" ? line.receivedProductId : null,
        mappedProductId: typeof line.mappedProductId === "string" ? line.mappedProductId : null,
        mappedProductName: optionalString(line.mappedProductName),
        suggestedProductId: typeof line.suggestedProductId === "string" ? line.suggestedProductId : null,
        suggestedProductName: optionalString(line.suggestedProductName),
      };
    }),
    lineCount: numberOr(row.lineCount, rawItems.length),
    totalQuantity: numberOr(row.totalQuantity),
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

function relativePath(target: string): string {
  if (target.startsWith("/")) return target;
  try {
    const url = new URL(target, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return target;
  }
}

async function fetchAllTransfers(query: Record<string, string | number>): Promise<B2BTransfer[]> {
  const client = getApiClient();
  const collected: B2BTransfer[] = [];
  let nextPath: string | null = TRANSFERS_PATH;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < 20; page += 1) {
    const body = await client.get<unknown>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body).map(fromApiB2BTransfer));
    const next = isRecord(body) && typeof body.next === "string" ? body.next : null;
    nextPath = next ? relativePath(next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** `direction` picks incoming (buying) vs outgoing (sending) rows. */
export function getTransfers(
  shopId: string,
  options: { direction?: "incoming" | "outgoing"; status?: string } = {}
): Promise<B2BTransfer[]> {
  const query: Record<string, string | number> = { shop_id: shopId, page_size: 200 };
  if (options.direction) query.direction = options.direction;
  if (options.status) query.status = options.status;
  return fetchAllTransfers(query);
}

export async function createStockTransfer(input: B2BTransferInput): Promise<B2BTransfer> {
  const raw = await getApiClient().post<unknown>(TRANSFERS_PATH, input);
  return fromApiB2BTransfer(raw);
}

export async function completeStockTransfer(transferId: string): Promise<B2BTransfer> {
  const raw = await getApiClient().post<unknown>(
    `${TRANSFERS_PATH}${encodeURIComponent(transferId)}/complete/`
  );
  return fromApiB2BTransfer(raw);
}

/**
 * One-tap receive for sale-staged manifests: the server auto-maps every line
 * (barcode → sku → name) and lands the stock, creating products it can't match.
 */
export async function acceptStockTransfer(transferId: string): Promise<B2BTransfer> {
  const raw = await getApiClient().post<unknown>(
    `${TRANSFERS_PATH}${encodeURIComponent(transferId)}/accept/`
  );
  return fromApiB2BTransfer(raw);
}

/** Buyer-side line mapping: each line lands on one of the receiver's products. */
export async function mapTransferItems(
  transferId: string,
  mappings: Array<{ itemId: string; productId: string | null }>
): Promise<B2BTransfer> {
  const raw = await getApiClient().post<unknown>(
    `${TRANSFERS_PATH}${encodeURIComponent(transferId)}/map/`,
    {
      items: mappings.map((m) => ({ itemId: m.itemId, productId: m.productId })),
    }
  );
  return fromApiB2BTransfer(raw);
}

export async function cancelStockTransfer(transferId: string): Promise<B2BTransfer> {
  const raw = await getApiClient().post<unknown>(
    `${TRANSFERS_PATH}${encodeURIComponent(transferId)}/cancel/`
  );
  return fromApiB2BTransfer(raw);
}
