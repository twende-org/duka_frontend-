/**
 * Saved-address domain adapter for the customer portal.
 *
 * The legacy backend kept these under ``users/{uid}/addresses/{autoId}``; Django stores
 * one row per address keyed by uuid. The portal page hands the whole snapshot
 * on create and deletes by id, mirroring the legacy document shape:
 *
 *   GET    /api/v1/addresses/          -> the caller's addresses, newest first
 *   POST   /api/v1/addresses/          -> create; the new id comes back
 *   DELETE /api/v1/addresses/{id}/     -> remove one
 *
 * Identity is resolved server-side from the JWT (the ``user`` FK is stamped by
 * the viewset), so the legacy ``userId`` arguments are kept only for signature
 * parity with the helpers they replace.
 */
import { getApiClient, unwrapList } from "../index";

const ADDRESSES_PATH = "/api/v1/addresses/";

/** DRF's max_page_size; the page renders the whole list, not pages. */
const MAX_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link. */
const MAX_PAGES = 100;

/** One saved address, matching the legacy document fields. */
export interface AddressRow {
  id: string;
  tag: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  isDefault: boolean;
}

export type AddressInput = Omit<AddressRow, "id">;

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

function booleanOr(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function fromApiAddress(raw: unknown): AddressRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    tag: stringOr(row.tag, "Nyumbani"),
    name: stringOr(row.name),
    phone: stringOr(row.phone),
    street: stringOr(row.street),
    city: stringOr(row.city),
    isDefault: booleanOr(row.isDefault ?? row.is_default),
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

/** Every address of the signed-in customer. */
export async function getAddresses(_userId: string): Promise<AddressRow[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = ADDRESSES_PATH;
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
  return collected.map(fromApiAddress);
}

/** Creates an address and resolves to the new row's id. */
export async function addAddress(_userId: string, data: AddressInput): Promise<string> {
  const body = await getApiClient().post<unknown>(ADDRESSES_PATH, data);
  return fromApiAddress(body).id;
}

/** Deletes an address. */
export async function deleteAddress(_userId: string, addressId: string): Promise<void> {
  await getApiClient().del<unknown>(`${ADDRESSES_PATH}${encodeURIComponent(addressId)}/`);
}
