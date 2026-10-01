/**
 * Announcements domain adapter.
 *
 * `AnnouncementBanner.tsx` (every signed-in user) and `AdminAnnouncements.tsx`
 * (platform admins) used to read the legacy ``announcements`` collection and
 * write it from the browser. Django now serves both:
 *
 *   GET    /api/v1/announcements/?active=true&page_size=1   -> the banner row
 *   GET    /api/v1/announcements/                           -> admin page list
 *   POST   /api/v1/announcements/                           -> create (admin)
 *   PATCH  /api/v1/announcements/{id}/                      -> toggle (admin)
 *   DELETE /api/v1/announcements/{id}/                      -> remove (admin)
 *
 * Non-admins only ever receive the active rows, so the banner's
 * ``?active=true`` read is explicit anyway: admins manage inactive drafts and
 * must not see one of those promoted into the banner.
 */
import { getApiClient, unwrapList } from "../index";

const ANNOUNCEMENTS_PATH = "/api/v1/announcements/";

/** DRF's max_page_size; the admin page has no cap, so walk the pages. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export type AnnouncementType = "info" | "warning" | "success" | "error";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  active: boolean;
  /** ISO string from DRF; the pages' `formatTime` accepts legacy stamps too. */
  createdAt?: unknown;
  createdBy?: string;
  createdByEmail?: string;
}

export interface AnnouncementInput {
  title: string;
  message: string;
  type: AnnouncementType;
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
  return typeof value === "string" && value ? value : undefined;
}

function toType(value: unknown): AnnouncementType {
  return value === "warning" || value === "success" || value === "error" ? value : "info";
}

export function fromApiAnnouncement(raw: unknown): Announcement {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    title: stringOr(row.title),
    message: stringOr(row.message),
    type: toType(row.type),
    active: row.active === undefined ? true : Boolean(row.active),
    createdAt: row.createdAt ?? undefined,
    createdBy: optionalString(row.createdBy),
    createdByEmail: optionalString(row.createdByEmail),
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

/** Walk DRF's page links so the admin list keeps its "returned everything" contract. */
async function fetchAll(query: Record<string, string | number>): Promise<unknown[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = ANNOUNCEMENTS_PATH;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** The banner's read: newest live announcement, or null when there is none. */
export async function fetchActiveAnnouncement(): Promise<Announcement | null> {
  const body = await getApiClient().get<unknown>(ANNOUNCEMENTS_PATH, {
    query: { active: "true", page_size: 1 },
  });
  const rows = unwrapList<unknown>(body);
  return rows.length ? fromApiAnnouncement(rows[0]) : null;
}

/** The admin page's read: every announcement, newest first server-side. */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const rows = await fetchAll({ page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiAnnouncement);
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return fromApiAnnouncement(
    await getApiClient().post<unknown>(ANNOUNCEMENTS_PATH, {
      title: input.title,
      message: input.message,
      type: input.type,
    })
  );
}

export async function setAnnouncementActive(id: string, active: boolean): Promise<Announcement> {
  return fromApiAnnouncement(
    await getApiClient().patch<unknown>(`${ANNOUNCEMENTS_PATH}${encodeURIComponent(id)}/`, { active })
  );
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await getApiClient().del<unknown>(`${ANNOUNCEMENTS_PATH}${encodeURIComponent(id)}/`);
}
