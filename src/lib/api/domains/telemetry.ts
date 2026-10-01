/**
 * Telemetry domain adapter: the merchant audit trail, the storefront funnel
 * events and the client error reports.
 *
 * The legacy app wrote ``activity_logs`` / ``analytics_events`` /
 * ``error_events`` documents straight from the browser; ``src/lib/activityLog.ts``
 * (audit trail + admin stream), ``src/lib/analytics.ts`` (storefront funnel) and
 * ``src/lib/errorLogger.ts`` (crash reports) now funnel through here:
 *
 *   POST  /api/v1/activity-logs/                     -> append (signed-in users)
 *   GET   /api/v1/activity-logs/?shop_id=&user_id=   -> audit reads, newest first
 *   POST  /api/v1/analytics-events/                  -> storefront event (guests OK)
 *   POST  /api/v1/error-events/                      -> crash report (guests OK)
 *   GET   /api/v1/analytics/shop-summary/?shop_id=&days=   -> funnel rollup
 *   GET   /api/v1/analytics/global-summary/?days=          -> platform rollup (staff)
 *
 * Writes are fire-and-forget: identity is stamped from the JWT server-side, so
 * callers only send the event itself, and the create endpoints never reject an
 * old client (unknown keys are ignored or kept in a payload blob).
 */
import { getApiClient, unwrapList } from "../index";

const ACTIVITY_LOGS_PATH = "/api/v1/activity-logs/";
const ANALYTICS_EVENTS_PATH = "/api/v1/analytics-events/";
const ERROR_EVENTS_PATH = "/api/v1/error-events/";
const SHOP_SUMMARY_PATH = "/api/v1/analytics/shop-summary/";
const GLOBAL_SUMMARY_PATH = "/api/v1/analytics/global-summary/";

/** DRF's max_page_size; matches the legacy 200-row page. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export interface ActivityLogRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  shopId: string;
  action: string;
  category: string;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt?: unknown;
}

export interface ActivityLogInput {
  role: string;
  shopId: string;
  action: string;
  category: string;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorEventRow {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  shopId?: string;
  action: string;
  errorMessage: string;
  errorCode?: string;
  route?: string;
  category: string;
  createdAt?: unknown;
}

export interface ErrorEventInput {
  action: string;
  errorMessage: string;
  errorCode?: string;
  route?: string;
  category: string;
  shopId?: string;
  [key: string]: unknown;
}

export interface ShopAnalyticsSummary {
  visits: number;
  productViews: number;
  whatsappClicks: number;
  followers: number;
}

export interface GlobalAnalyticsSummary {
  totalSearches: number;
  totalWhatsAppClicks: number;
  totalShopVisits: number;
  topSearches: { query: string; count: number }[];
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
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function fromApiActivityLog(raw: unknown): ActivityLogRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    userId: stringOr(row.userId ?? row.user_id),
    userEmail: stringOr(row.userEmail ?? row.user_email),
    userName: stringOr(row.userName ?? row.user_name),
    role: stringOr(row.role),
    shopId: stringOr(row.shopId ?? row.shop_id),
    action: stringOr(row.action),
    category: stringOr(row.category),
    details: stringOr(row.details),
    metadata: isRecord(row.metadata) ? row.metadata : undefined,
    createdAt: row.createdAt ?? undefined,
  };
}

export function fromApiErrorEvent(raw: unknown): ErrorEventRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    userId: optionalString(row.userId ?? row.user_id),
    userEmail: optionalString(row.userEmail ?? row.user_email),
    userName: optionalString(row.userName ?? row.user_name),
    shopId: optionalString(row.shopId ?? row.shop_id),
    action: stringOr(row.action),
    errorMessage: stringOr(row.errorMessage ?? row.error_message),
    errorCode: optionalString(row.errorCode ?? row.error_code),
    route: optionalString(row.route),
    category: stringOr(row.category),
    createdAt: row.createdAt ?? undefined,
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
 * Walk DRF's page links, newest first server-side, and stop once ``limit`` rows
 * are collected so a read never downloads the whole collection.
 */
async function fetchAll(
  pagePath: string,
  query: Record<string, string | number>,
  limit: number
): Promise<unknown[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = pagePath;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES && collected.length < limit; page += 1) {
    const body = await client.get<DrfPage<unknown>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected.slice(0, limit);
}

/** Query a page-limited read and normalize the rows. */
async function fetchRows<T>(
  pagePath: string,
  query: Record<string, string | number>,
  limit: number,
  normalize: (raw: unknown) => T
): Promise<T[]> {
  const rows = await fetchAll(pagePath, query, limit);
  return rows.map(normalize);
}

/**
 * The merchant audit trail. ``shopId`` scopes it to one shop (members only) and
 * ``userId`` to one person; neither means the platform stream (staff only).
 */
export async function fetchActivityLogs(params: {
  shopId?: string;
  userId?: string;
  maxResults?: number;
} = {}): Promise<ActivityLogRow[]> {
  const query: Record<string, string | number> = { page_size: MAX_PAGE_SIZE };
  if (params.shopId) query.shop_id = params.shopId;
  if (params.userId) query.user_id = params.userId;
  return fetchRows(ACTIVITY_LOGS_PATH, query, params.maxResults ?? MAX_PAGE_SIZE, fromApiActivityLog);
}

/** Append an audit row; the actor's identity is stamped server-side. */
export async function writeActivityLog(input: ActivityLogInput): Promise<void> {
  await getApiClient().post<unknown>(ACTIVITY_LOGS_PATH, {
    role: input.role,
    shopId: input.shopId,
    action: input.action,
    category: input.category,
    details: input.details,
    metadata: input.metadata ?? {},
  });
}

/**
 * Fire a storefront funnel event. The storefront is public, so this works
 * without a session; the payload keys the backend does not model as columns are
 * kept in its ``payload`` blob.
 */
export async function writeAnalyticsEvent(
  input: { eventType: string; deviceId: string; url: string; userId?: string | null } & Record<
    string,
    unknown
  >
): Promise<void> {
  await getApiClient().post<unknown>(ANALYTICS_EVENTS_PATH, {
    ...input,
    userId: input.userId ?? "",
  });
}

/** File a crash report; never fails the caller's context (login, 404, boundary). */
export async function writeErrorEvent(input: ErrorEventInput): Promise<void> {
  await getApiClient().post<unknown>(ERROR_EVENTS_PATH, input);
}

/** Staff-only read of the crash reports, newest first. */
export async function fetchErrorEvents(maxResults = 300): Promise<ErrorEventRow[]> {
  return fetchRows(ERROR_EVENTS_PATH, { page_size: MAX_PAGE_SIZE }, maxResults, fromApiErrorEvent);
}

export function fromApiShopSummary(raw: unknown): ShopAnalyticsSummary {
  const row = isRecord(raw) ? raw : {};
  return {
    visits: numberOr(row.visits),
    productViews: numberOr(row.productViews),
    whatsappClicks: numberOr(row.whatsappClicks),
    followers: numberOr(row.followers),
  };
}

export function fromApiGlobalSummary(raw: unknown): GlobalAnalyticsSummary {
  const row = isRecord(raw) ? raw : {};
  const topSearches = Array.isArray(row.topSearches) ? row.topSearches : [];
  return {
    totalSearches: numberOr(row.totalSearches),
    totalWhatsAppClicks: numberOr(row.totalWhatsAppClicks),
    totalShopVisits: numberOr(row.totalShopVisits),
    topSearches: topSearches
      .filter(isRecord)
      .map((entry) => ({ query: stringOr(entry.query), count: numberOr(entry.count) })),
  };
}

/** One shop's funnel over a window (the merchant dashboard card). */
export async function fetchShopAnalyticsSummary(
  shopId: string,
  days: number
): Promise<ShopAnalyticsSummary> {
  return fromApiShopSummary(
    await getApiClient().get<unknown>(SHOP_SUMMARY_PATH, { query: { shop_id: shopId, days } })
  );
}

/** Platform-wide funnel totals for the admin dashboard (staff only). */
export async function fetchGlobalAnalyticsSummary(days: number): Promise<GlobalAnalyticsSummary> {
  return fromApiGlobalSummary(
    await getApiClient().get<unknown>(GLOBAL_SUMMARY_PATH, { query: { days } })
  );
}
