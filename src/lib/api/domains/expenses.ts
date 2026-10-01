/**
 * Expenses domain adapter for the strangler-fig cutover.
 *
 * `useExpenses.ts` and `expensesSlice.ts` keep calling the same functions they
 * called on the legacy backend, so `Expenses.tsx` and the
 * dashboards stay untouched. This module translates:
 *   - DRF expense rows to the app's `Expense` shape (including `paidTo` and
 *     `isRecurring`, which the page reads off the row),
 *   - the legacy cursor contract (`lastDoc` was a snapshot) to DRF page
 *     numbers, so `useInfiniteQuery` keeps walking pages the same way,
 *   - the legacy "record + daily summary" write to a single POST: the backend
 *     transaction updates the day totals server-side.
 */
import type { Expense } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const EXPENSES_PATH = "/api/v1/expenses/";

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

export function fromApiExpense(raw: unknown): Expense {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    shopId: refId(row.shopId),
    branchId: optionalString(refId(row.branchId)),
    category: stringOr(row.category),
    description: stringOr(row.description),
    amount: numberOr(row.amount),
    date: stringOr(row.date),
    paymentMethod: stringOr(row.paymentMethod),
    reference: optionalString(row.reference),
    notes: optionalString(row.notes),
    shiftId: optionalString(refId(row.shiftId)),
    paidTo: optionalString(row.paidTo),
    isRecurring: row.isRecurring === true ? true : undefined,
  };
}

/**
 * camelCase payload. Blank foreign keys are dropped: the backend's legacy id
 * resolver treats `""` as an unresolvable reference and rejects it with a 400.
 */
function toExpensePayload(data: Partial<Omit<Expense, "id">>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.shopId !== undefined) payload.shopId = data.shopId;
  if (data.branchId) payload.branchId = data.branchId;
  if (data.category !== undefined) payload.category = data.category;
  if (data.description !== undefined) payload.description = data.description;
  if (data.amount !== undefined) payload.amount = data.amount;
  if (data.date !== undefined) payload.date = data.date.split("T")[0];
  if (data.paymentMethod !== undefined) payload.paymentMethod = data.paymentMethod;
  if (data.reference !== undefined) payload.reference = data.reference;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.shiftId) payload.shiftId = data.shiftId;
  if (data.paidTo !== undefined) payload.paidTo = data.paidTo;
  if (data.isRecurring !== undefined) payload.isRecurring = data.isRecurring;
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

/** Walk DRF's page links to honour the old "getExpenses returned everything" contract. */
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

export async function getExpenses(shopId: string, branchId?: string): Promise<Expense[]> {
  const query: Record<string, string | number> = { shop_id: shopId, page_size: MAX_PAGE_SIZE };
  if (branchId) query.branch_id = branchId;
  const rows = await fetchAll<unknown>(EXPENSES_PATH, query);
  return rows.map(fromApiExpense);
}

/**
 * The legacy store paged with a snapshot cursor; DRF pages by number. `lastDoc` stays
 * the opaque value the hook hands back via `getNextPageParam`, so the shape the
 * infinite query reads (`hasMore` / `lastDoc`) is unchanged.
 */
export async function getExpensesPaginated(
  shopId: string,
  pageSize: number = 20,
  lastDoc?: unknown,
  branchId?: string
): Promise<{ data: Expense[]; lastDoc: number | null; hasMore: boolean }> {
  const previousPage =
    typeof lastDoc === "number" && Number.isFinite(lastDoc) && lastDoc > 0 ? lastDoc : 0;
  const page = previousPage + 1;
  const query: Record<string, string | number> = {
    shop_id: shopId,
    page,
    page_size: Math.max(1, Math.floor(pageSize) || 20),
  };
  if (branchId) query.branch_id = branchId;
  const body = await getApiClient().get<DrfPage<unknown>>(EXPENSES_PATH, { query });
  const data = unwrapList<unknown>(body).map(fromApiExpense);
  return { data, lastDoc: data.length > 0 ? page : null, hasMore: Boolean(body?.next) };
}

/** Same contract as the legacy version: the backend updates the day totals too. */
export async function addExpenseWithSummary(data: Omit<Expense, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(EXPENSES_PATH, toExpensePayload(data));
  return appVisibleId(isRecord(created) ? created : {});
}

export async function addExpense(data: Omit<Expense, "id">): Promise<string> {
  return addExpenseWithSummary(data);
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await getApiClient().patch<unknown>(`${EXPENSES_PATH}${encodeURIComponent(id)}/`, toExpensePayload(data));
}

export async function deleteExpense(id: string): Promise<void> {
  await getApiClient().del<unknown>(`${EXPENSES_PATH}${encodeURIComponent(id)}/`);
}
