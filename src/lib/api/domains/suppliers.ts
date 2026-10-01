/**
 * Suppliers domain adapter for the strangler-fig cutover.
 *
 * `Suppliers.tsx` and `suppliersSlice.ts` keep calling the same functions they
 * called on the legacy backend, so this module translates:
 *   - DRF supplier rows to the app's `Supplier` shape (blank nullable columns
 *     come back as the empty strings the forms expect),
 *   - the legacy cursor-based `getSuppliersPaginated` contract to DRF's
 *     `next` link: `lastDoc` becomes the follow-up request path, which
 *     `usePaginatedSuppliers` threads back through `getNextPageParam`.
 */
import type { Supplier } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const SUPPLIERS_PATH = "/api/v1/suppliers/";

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

/** A foreign-key id, whether the serializer inlined it or sent the app-visible id. */
function refId(value: unknown): string {
  if (isRecord(value)) return stringOr(value.legacyId) || stringOr(value.id);
  return stringOr(value);
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
    const body = await client.get<DrfPage<T>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

export function fromApiSupplier(raw: unknown): Supplier {
  const row = isRecord(raw) ? raw : {};
  return {
    // The Django uuid is the app-visible id; only imported rows
    // carry a `legacyId` that the app already knows them by.
    id: stringOr(row.legacyId) || stringOr(row.id),
    shopId: refId(row.shopId),
    name: stringOr(row.name),
    phone: stringOr(row.phone),
    email: optionalString(row.email),
    address: optionalString(row.address),
    products: stringOr(row.products),
    notes: stringOr(row.notes),
    ownerId: stringOr(row.ownerId),
    platformShopId: optionalString(row.platformShopId),
  };
}

/** The camelCase aliases `CreateSupplierInputSerializer`/`UpdateSupplierInputSerializer` accept. */
function supplierPayload(data: Partial<Omit<Supplier, "id">>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.shopId !== undefined) payload.shopId = data.shopId;
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined) payload.phone = data.phone ?? "";
  if (data.email !== undefined) payload.email = data.email ?? "";
  if (data.address !== undefined) payload.address = data.address ?? "";
  if (data.products !== undefined) payload.products = data.products ?? "";
  if (data.notes !== undefined) payload.notes = data.notes ?? "";
  if (data.ownerId !== undefined) payload.ownerId = data.ownerId ?? "";
  if (data.platformShopId !== undefined) payload.platformShopId = data.platformShopId ?? "";
  return payload;
}

export async function getSuppliers(shopId: string): Promise<Supplier[]> {
  const rows = await fetchAll<unknown>(SUPPLIERS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiSupplier);
}

/**
 * One page per call, same as the legacy version. `lastDoc` is the request
 * path DRF's `next` link points at (relative), which the caller passes back on
 * the following call; `hasMore` mirrors whether that link exists.
 */
export async function getSuppliersPaginated(
  shopId: string,
  pageSize: number = 20,
  lastDoc: string | null = null
): Promise<{ data: Supplier[]; lastDoc: string | null; hasMore: boolean }> {
  const body = lastDoc
    ? await getApiClient().get<DrfPage<unknown>>(lastDoc)
    : await getApiClient().get<DrfPage<unknown>>(SUPPLIERS_PATH, {
        query: { shop_id: shopId, page_size: pageSize },
      });
  const next = body?.next ? relativePath(body.next) : null;
  return {
    data: unwrapList<unknown>(body).map(fromApiSupplier),
    lastDoc: next,
    hasMore: Boolean(next),
  };
}

export async function addSupplier(data: Omit<Supplier, "id">): Promise<string> {
  const body = await getApiClient().post<unknown>(SUPPLIERS_PATH, supplierPayload(data));
  return fromApiSupplier(body).id;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
  // The backend resolves either the uuid or a legacy id in the URL pk slot.
  await getApiClient().patch<unknown>(`${SUPPLIERS_PATH}${encodeURIComponent(id)}/`, supplierPayload(data));
}

export async function deleteSupplier(id: string): Promise<void> {
  await getApiClient().del<unknown>(`${SUPPLIERS_PATH}${encodeURIComponent(id)}/`);
}
