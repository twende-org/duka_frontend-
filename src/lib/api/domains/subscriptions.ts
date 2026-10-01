/**
 * Subscription domain adapter.
 *
 * The plan row used to be the legacy ``subscriptions/{uid}`` document (the
 * user id *was* the document id); Django mirrors that, so every call below is
 * keyed by the app-visible user id:
 *
 *   GET   /api/v1/subscriptions/{user_id}/        -> row, or 200 with an empty
 *                                                    body when the user has none
 *   PUT   /api/v1/subscriptions/{user_id}/        -> upsert (201 on create),
 *                                                    the legacy ``setDoc``
 *   PATCH /api/v1/subscriptions/{user_id}/        -> partial merge
 *   POST  /api/v1/subscriptions/{user_id}/confirm/ -> staff activation
 *   GET   /api/v1/subscriptions/?page_size=200    -> admin directory (paged)
 *
 * ``confirm`` stamps ``confirmedBy``/``confirmedAt`` from the token server-side;
 * the legacy ``adminId`` argument is therefore accepted but never sent.
 */
import { getApiClient, unwrapList } from "../index";

const SUBSCRIPTIONS_PATH = "/api/v1/subscriptions/";

/** DRF's max_page_size; matches the legacy read of the whole collection. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

/** Wire shape: snake-or-camel tolerant, ``amount`` already coerced to a number. */
export interface SubscriptionRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  paymentMethod?: string;
  paymentReference?: string;
  amount: number;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPatch {
  userEmail?: string;
  userName?: string;
  plan?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  paymentMethod?: string;
  paymentReference?: string;
  amount?: number;
}

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
  count?: number;
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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function fromApiSubscription(raw: unknown): SubscriptionRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id ?? row.userId ?? row.user_id),
    userId: stringOr(row.userId ?? row.user_id),
    userEmail: stringOr(row.userEmail ?? row.user_email),
    userName: stringOr(row.userName ?? row.user_name),
    plan: stringOr(row.plan, "free"),
    status: stringOr(row.status, "pending"),
    startDate: stringOr(row.startDate ?? row.start_date),
    endDate: stringOr(row.endDate ?? row.end_date),
    paymentMethod: optionalString(row.paymentMethod ?? row.payment_method),
    paymentReference: optionalString(row.paymentReference ?? row.payment_reference),
    amount: numberOr(row.amount),
    confirmedBy: optionalString(row.confirmedBy ?? row.confirmed_by),
    confirmedAt: optionalString(row.confirmedAt ?? row.confirmed_at),
    createdAt: optionalString(row.createdAt ?? row.created_at),
    updatedAt: optionalString(row.updatedAt ?? row.updated_at),
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

/** The caller's plan row; ``null`` when the user never subscribed (free tier). */
export async function fetchSubscription(userId: string): Promise<SubscriptionRow | null> {
  const body = await getApiClient().get<unknown>(
    `${SUBSCRIPTIONS_PATH}${encodeURIComponent(userId)}/`
  );
  return isRecord(body) ? fromApiSubscription(body) : null;
}

/**
 * Upsert one user's plan row. ``PUT`` mirrors the legacy ``setDoc`` (creates
 * when missing, HTTP 201, and replaces when present); ``PATCH`` merges.
 */
export async function saveSubscription(
  userId: string,
  patch: SubscriptionPatch,
  partial = false
): Promise<SubscriptionRow> {
  const path = `${SUBSCRIPTIONS_PATH}${encodeURIComponent(userId)}/`;
  const body = partial
    ? await getApiClient().patch<unknown>(path, patch)
    : await getApiClient().put<unknown>(path, patch);
  return fromApiSubscription(body);
}

/** Staff activation: sets ``status='active'`` and stamps who did it. */
export async function confirmSubscriptionOnApi(userId: string): Promise<SubscriptionRow> {
  return fromApiSubscription(
    await getApiClient().post<unknown>(
      `${SUBSCRIPTIONS_PATH}${encodeURIComponent(userId)}/confirm/`
    )
  );
}

/** Every plan row, for the admin directory. */
export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = SUBSCRIPTIONS_PATH;
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
  return collected.map(fromApiSubscription);
}
