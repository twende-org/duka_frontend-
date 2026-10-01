/**
 * Platform-user administration adapter (staff only).
 *
 * The admin pages used to read and write the legacy ``users`` / ``admins``
 * collections straight from the browser; Django now owns both:
 *
 *   GET    /api/v1/users/?page_size=200      -> platform user directory (paged)
 *   GET    /api/v1/users/?business_status=PENDING  -> wholesale application queue
 *   PATCH  /api/v1/users/{id}/               -> suspension flag / business profile
 *   POST   /api/v1/users/{id}/system-admin/  -> grant (or revoke) ``is_staff``
 *   DELETE /api/v1/users/{id}/               -> account + roles/subscription cascade
 *
 * ``approveBusinessApplication`` / ``rejectBusinessApplication`` are the admin
 * decision on a PENDING application; they merge ``businessProfile`` server-side
 * so only the decision keys change, matching the legacy dot-path writes.
 *
 * ``{id}`` may be the app-visible id (the legacy ``users/{uid}`` document id) or
 * the Django uuid; the backend resolves both, and every id it answers with is
 * app-visible so the admin pages keep joining rows by the id they already hold.
 */
import type { BusinessProfile } from "@/types";
import { getApiClient, unwrapList } from "../index";

const USERS_PATH = "/api/v1/users/";

/** DRF's max_page_size; matches the legacy 200-row page. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  accountType?: string;
  isStaff: boolean;
  isSuspended: boolean;
  /** Absent (rather than empty) when the user never applied for wholesale. */
  businessProfile?: BusinessProfile;
  createdAt?: string;
}

export interface PlatformUserPatch {
  isSuspended?: boolean;
  businessProfile?: Partial<BusinessProfile>;
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

export function fromApiPlatformUser(raw: unknown): PlatformUser {
  const row = isRecord(raw) ? raw : {};
  const businessProfile = row.businessProfile ?? row.business_profile;
  return {
    id: stringOr(row.id),
    email: stringOr(row.email),
    displayName: stringOr(row.displayName ?? row.display_name),
    phone: optionalString(row.phone),
    accountType: optionalString(row.accountType ?? row.account_type),
    isStaff: Boolean(row.isStaff ?? row.is_staff),
    isSuspended: Boolean(row.isSuspended ?? row.is_suspended),
    businessProfile: isRecord(businessProfile)
      ? (businessProfile as unknown as BusinessProfile)
      : undefined,
    createdAt: optionalString(row.createdAt ?? row.created_at),
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
 * The directory, newest registrations first server-side. ``businessStatus``
 * narrows it to one application state (the queue passes ``PENDING``).
 */
export async function listPlatformUsers(
  businessStatus?: string
): Promise<PlatformUser[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  const query: Record<string, string | number> = { page_size: MAX_PAGE_SIZE };
  if (businessStatus) query.business_status = businessStatus;
  let nextPath: string | null = USERS_PATH;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected.map(fromApiPlatformUser);
}

/**
 * The wholesale applications waiting for a decision (staff only). The legacy
 * ``getPendingBusinessApplications`` name is kept because the admin page imports
 * it by that name; the caller renders ``businessProfile.companyName`` / ``tin``.
 */
export async function getPendingBusinessApplications(): Promise<PlatformUser[]> {
  return listPlatformUsers("PENDING");
}

/**
 * Approve a wholesale application. The legacy write set the credit limit (and
 * the balance that mirrors it) plus the approval timestamp; the backend merges
 * these into ``businessProfile`` so the company details survive.
 */
export async function approveBusinessApplication(
  userId: string,
  creditLimit = 1000000
): Promise<PlatformUser> {
  return updatePlatformUser(userId, {
    businessProfile: {
      status: "APPROVED",
      creditLimit,
      creditBalance: creditLimit,
      approvedAt: new Date().toISOString(),
    },
  });
}

/** Reject a wholesale application (only the status changes, as in the legacy app). */
export async function rejectBusinessApplication(userId: string): Promise<PlatformUser> {
  return updatePlatformUser(userId, { businessProfile: { status: "REJECTED" } });
}

/**
 * Apply the admin toggles. ``businessProfile`` is merged key-by-key server-side,
 * mirroring the legacy dot-path write that changed only ``businessProfile.status``.
 */
export async function updatePlatformUser(
  userId: string,
  patch: PlatformUserPatch
): Promise<PlatformUser> {
  return fromApiPlatformUser(
    await getApiClient().patch<unknown>(`${USERS_PATH}${encodeURIComponent(userId)}/`, patch)
  );
}

/** Grant (default) or revoke the platform-admin flag; the email is no longer needed. */
export async function grantPlatformAdmin(
  userId: string,
  isSystemAdmin = true
): Promise<PlatformUser> {
  return fromApiPlatformUser(
    await getApiClient().post<unknown>(
      `${USERS_PATH}${encodeURIComponent(userId)}/system-admin/`,
      { isSystemAdmin }
    )
  );
}

/** Delete the account; roles, subscription and wishlist cascade server-side. */
export async function deletePlatformUser(userId: string): Promise<void> {
  await getApiClient().del<unknown>(`${USERS_PATH}${encodeURIComponent(userId)}/`);
}
