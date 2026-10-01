/**
 * Identity domain adapter for the strangler-fig cutover.
 *
 * After sign-in the app resolves the account's phone/email so CRM rows (and the
 * sales/orders behind them) created before this account existed get attached to
 * it. The Django endpoint matches phone spellings plus case-insensitive email
 * and answers `{ success, linkedCount }`.
 */
import type { UserProfile } from "@/types";
import { getApiClient } from "../index";

const IDENTITY_RESOLVE_PATH = "/api/v1/identity/resolve/";


export interface IdentityResolution {
  success: boolean;
  /** CRM rows matched (and possibly claimed) by this phone/email. */
  linkedCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Attach this account to every CRM row its phone/email matches. */
export async function resolveIdentityOnApi(
  phone: string,
  email: string
): Promise<IdentityResolution> {
  const body = await getApiClient().post<unknown>(IDENTITY_RESOLVE_PATH, { phone, email });
  const row = isRecord(body) ? body : {};
  const linkedCount = Number(row.linkedCount);
  return {
    success: row.success === true,
    linkedCount: Number.isFinite(linkedCount) ? linkedCount : 0,
  };
}

/**
 * Fire-and-forget resolution for sign-in flows: linking history must never
 * block or fail the sign-in itself.
 */
export function resolveIdentityInBackground(
  user: Pick<UserProfile, "phone" | "email"> | null | undefined
): void {
  const phone = user?.phone ?? "";
  const email = user?.email ?? "";
  if (!phone && !email) return;
  resolveIdentityOnApi(phone, email).catch((error) => {
    console.warn("Identity resolution failed:", error);
  });
}
