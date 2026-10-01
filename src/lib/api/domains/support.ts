/**
 * Support tickets domain adapter.
 *
 * `AppLayout.tsx` files a ticket from the help dialog (any signed-in user) and
 * `AdminSupport.tsx` / `AdminLayout.tsx` work the queue (platform admins only).
 * The legacy app wrote and read the ``support_tickets`` collection
 * straight from the browser; Django now owns it:
 *
 *   POST   /api/v1/support-tickets/                  -> submit (any user)
 *   GET    /api/v1/support-tickets/                  -> admin queue, newest first
 *   GET    /api/v1/support-tickets/?resolved=false&page_size=1  -> badge count
 *   PATCH  /api/v1/support-tickets/{id}/             -> flip ``resolved``
 *
 * The submitter's identity is stamped from the JWT server-side, so callers only
 * send the message plus optional context.
 */
import { getApiClient, unwrapList } from "../index";

const SUPPORT_PATH = "/api/v1/support-tickets/";

/** DRF's max_page_size; matches the legacy 200-row page. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export interface SupportTicket {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  shopId?: string;
  message: string;
  category: string;
  route?: string;
  resolved: boolean;
  createdAt?: unknown;
}

export interface SupportTicketInput {
  message: string;
  category: string;
  shopId?: string | null;
  route?: string;
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

export function fromApiSupportTicket(raw: unknown): SupportTicket {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    userId: optionalString(row.userId),
    userEmail: optionalString(row.userEmail),
    userName: optionalString(row.userName),
    shopId: optionalString(row.shopId),
    message: stringOr(row.message),
    category: stringOr(row.category, "Bug"),
    route: optionalString(row.route),
    resolved: Boolean(row.resolved),
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

/** Walk DRF's page links so the admin queue keeps its "returned everything" contract. */
async function fetchAll(query: Record<string, string | number>): Promise<unknown[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = SUPPORT_PATH;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** The admin queue: every ticket, newest first server-side. */
export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const rows = await fetchAll({ page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiSupportTicket);
}

/** The admin sidebar badge: how many tickets are still open. */
export async function countOpenSupportTickets(): Promise<number> {
  const body = await getApiClient().get<unknown>(SUPPORT_PATH, {
    query: { resolved: "false", page_size: 1 },
  });
  const row = isRecord(body) ? body : {};
  const count = row.count;
  return typeof count === "number" && Number.isFinite(count) ? count : 0;
}

/** File a ticket; identity fields are stamped server-side from the JWT. */
export async function submitSupportTicket(input: SupportTicketInput): Promise<SupportTicket> {
  return fromApiSupportTicket(
    await getApiClient().post<unknown>(SUPPORT_PATH, {
      message: input.message,
      category: input.category,
      shopId: input.shopId ?? "",
      route: input.route ?? "",
    })
  );
}

export async function setSupportTicketResolved(id: string, resolved: boolean): Promise<SupportTicket> {
  return fromApiSupportTicket(
    await getApiClient().patch<unknown>(`${SUPPORT_PATH}${encodeURIComponent(id)}/`, { resolved })
  );
}
