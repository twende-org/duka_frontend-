/**
 * Shifts (cash drawer) domain adapter for the strangler-fig cutover.
 *
 * `shiftsSlice.ts` keeps calling the same three functions it called on
 * the legacy backend, so `Sales.tsx`'s register controls stay untouched. This module
 * translates:
 *   - DRF shift rows to the app's `Shift` shape (dates, camelCase aliases),
 *   - the drawer's open payload: identity and status come from the JWT /
 *     server, never the client,
 *   - closing: totals, discrepancy and the PENDING owner approval are computed
 *     server-side.
 */
import type { Shift } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const SHIFTS_PATH = "/api/v1/shifts/";

/** DRF's max_page_size; the reports page renders the whole shift history. */
const MAX_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link. */
const MAX_PAGES = 100;

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function appVisibleId(row: Record<string, unknown>): string {
  return stringOr(row.legacyId) || stringOr(row.id);
}

export function fromApiShift(raw: unknown): Shift {
  const row = isRecord(raw) ? raw : {};
  return {
    id: appVisibleId(row),
    shopId: refId(row.shopId),
    status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
    openedBy: refId(row.openedBy),
    openedByName: optionalString(row.openedByName),
    openedAt: (row.openedAt ?? row.createdAt) as Shift["openedAt"],
    openingCash: numberOr(row.openingCash),
    closedBy: optionalString(refId(row.closedBy)),
    closedByName: optionalString(row.closedByName),
    closedAt: (row.closedAt ?? undefined) as Shift["closedAt"],
    cashSalesTotal: numberOr(row.cashSalesTotal),
    cashExpensesTotal: numberOr(row.cashExpensesTotal),
    expectedClosingCash: numberOr(row.expectedClosingCash),
    actualClosingCash: optionalNumber(row.actualClosingCash),
    cashLeftForNextDay: optionalNumber(row.cashLeftForNextDay),
    cashSubmittedToOwner: optionalNumber(row.cashSubmittedToOwner),
    discrepancy: optionalNumber(row.discrepancy),
    notes: optionalString(row.notes),
    ownerApprovalStatus: (row.ownerApprovalStatus as Shift["ownerApprovalStatus"]) ?? undefined,
  };
}

export async function getCurrentOpenShift(shopId: string, branchId?: string): Promise<Shift | null> {
  const query: Record<string, string | number> = { shop_id: shopId, status: "OPEN", page_size: 1 };
  if (branchId) query.branch_id = branchId;
  const body = await getApiClient().get<unknown>(SHIFTS_PATH, { query });
  const row = unwrapList<unknown>(body)[0];
  return row ? fromApiShift(row) : null;
}

/** This shop's shifts, newest first. */
export async function listShifts(shopId: string): Promise<Shift[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = SHIFTS_PATH;
  let nextQuery: Record<string, string | number> | undefined = { shop_id: shopId, page_size: MAX_PAGE_SIZE };
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(
      nextPath,
      nextQuery ? { query: nextQuery } : undefined
    );
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected.map(fromApiShift);
}

/** `status` and `openedBy` are server-owned; the payload may still carry them. */
export async function openShift(
  data: Omit<Shift, "id" | "cashSalesTotal" | "cashExpensesTotal" | "expectedClosingCash">
): Promise<Shift> {
  const payload: Record<string, unknown> = {
    shopId: data.shopId,
    openingCash: data.openingCash ?? 0,
  };
  if (data.openedByName) payload.openedByName = data.openedByName;
  if (data.openedAt) payload.openedAt = data.openedAt;
  if (data.notes) payload.notes = data.notes;
  const created = await getApiClient().post<unknown>(SHIFTS_PATH, payload);
  return fromApiShift(created);
}

export async function closeShift(
  _shopId: string,
  shiftId: string,
  closingData: {
    closedBy: string;
    closedByName: string;
    actualClosingCash: number;
    cashLeftForNextDay: number;
    cashSubmittedToOwner: number;
    notes?: string;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    actualClosingCash: closingData.actualClosingCash,
    cashLeftForNextDay: closingData.cashLeftForNextDay,
    cashSubmittedToOwner: closingData.cashSubmittedToOwner,
  };
  if (closingData.closedByName) payload.closedByName = closingData.closedByName;
  if (closingData.notes) payload.notes = closingData.notes;
  await getApiClient().post<unknown>(`${SHIFTS_PATH}${encodeURIComponent(shiftId)}/close/`, payload);
}
