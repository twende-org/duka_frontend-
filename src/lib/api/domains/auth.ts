import type { UserProfile, UserRole } from "@/types";
import { clearApiTokens, getApiClient, setApiSession } from "../index";
import { unwrapList } from "../client";

/**
 * Auth adapter for the Django endpoints in ``apps/users``.
 *
 * Every sign-in route (email/password, register, Google) answers with the same
 * envelope — ``{access, refresh, is_new_user, user}`` — where the user object is
 * snake_case and embeds the caller's shop roles. The adapter stores the JWT pair
 * in the shared token provider and converts the payload to the camelCase shapes
 * the Redux store and guards already consume.
 */

export interface AuthSession {
  user: UserProfile;
  roles: UserRole[];
  isNewUser: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  accountType?: "merchant" | "staff" | "customer" | "unassigned";
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

/** Read the first non-empty string among ``keys`` (tolerates snake/camel spellings). */
function pickString(record: UnknownRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

export function toUserRole(raw: unknown): UserRole {
  const record = asRecord(raw);
  return {
    id: pickString(record, "id"),
    userId: pickString(record, "userId", "user_id"),
    shopId: pickString(record, "shopId", "shop_id"),
    role: pickString(record, "role") as UserRole["role"],
  };
}

export function toUserProfile(raw: unknown): UserProfile {
  const record = asRecord(raw);
  const capabilities = asRecord(record.capabilities);
  const defaultWorkspace = pickString(record, "defaultWorkspace", "default_workspace");
  // Django answers ``null`` (not ``{}``) when the user never applied, and the
  // wholesale pages treat the field's truthiness as "has an application".
  const businessProfile = record.businessProfile ?? record.business_profile;
  return {
    id: pickString(record, "id"),
    email: pickString(record, "email"),
    displayName: pickString(record, "displayName", "display_name"),
    phone: pickString(record, "phone") || undefined,
    createdAt: pickString(record, "createdAt", "created_at", "date_joined") || undefined,
    accountType: (pickString(record, "accountType", "account_type") ||
      undefined) as UserProfile["accountType"],
    capabilities: {
      canShop: Boolean(capabilities.canShop ?? capabilities.can_shop),
      canManageBusiness: Boolean(
        capabilities.canManageBusiness ?? capabilities.can_manage_business
      ),
      canBuyForBusiness: Boolean(
        capabilities.canBuyForBusiness ?? capabilities.can_buy_for_business
      ),
    },
    defaultWorkspace: (defaultWorkspace || undefined) as UserProfile["defaultWorkspace"],
    businessProfile:
      businessProfile && typeof businessProfile === "object" && !Array.isArray(businessProfile)
        ? (businessProfile as UserProfile["businessProfile"])
        : undefined,
    corporateProfile: toCorporateProfile(record.corporateProfile ?? record.corporate_profile),
    isStaff: Boolean(record.isStaff ?? record.is_staff),
  };
}

/**
 * Company membership granted by staff. The corporate pages call
 * ``.toLocaleString()`` on the credit numbers, so string decimals are coerced.
 */
function toCorporateProfile(raw: unknown): UserProfile["corporateProfile"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as UnknownRecord;
  const numberField = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };
  return {
    companyId: pickString(record, "companyId", "company_id"),
    companyName: pickString(record, "companyName", "company_name"),
    tin: pickString(record, "tin"),
    vrn: pickString(record, "vrn") || undefined,
    departmentId: pickString(record, "departmentId", "department_id"),
    role: pickString(record, "role") as "buyer" | "approver" | "admin",
    creditLimit: numberField(record.creditLimit ?? record.credit_limit),
    creditBalance: numberField(record.creditBalance ?? record.credit_balance),
    status: pickString(record, "status") as "PENDING" | "APPROVED" | "REJECTED",
    approvedAt: pickString(record, "approvedAt", "approved_at") || undefined,
  };
}

function toAuthSession(raw: unknown): AuthSession {
  const record = asRecord(raw);
  const access = pickString(record, "access");
  const refresh = pickString(record, "refresh");
  if (access && refresh) setApiSession(access, refresh);

  const user = toUserProfile(record.user);
  const embedded = Array.isArray(asRecord(record.user).roles) ? asRecord(record.user).roles : [];
  return {
    user,
    roles: (embedded as unknown[]).map(toUserRole),
    isNewUser: Boolean(record.is_new_user ?? record.isNewUser),
  };
}

export async function loginWithEmailOnApi(email: string, password: string): Promise<AuthSession> {
  const body = await getApiClient().post<unknown>(
    "/api/auth/login/",
    { email, password },
    { auth: false }
  );
  return toAuthSession(body);
}

export async function registerWithEmailOnApi(input: RegisterInput): Promise<AuthSession> {
  const body = await getApiClient().post<unknown>(
    "/api/auth/register/",
    {
      email: input.email,
      password: input.password,
      displayName: input.displayName ?? "",
      phone: input.phone ?? "",
      accountType: input.accountType ?? "customer",
    },
    { auth: false }
  );
  return toAuthSession(body);
}

export async function loginWithGoogleOnApi(googleIdToken: string): Promise<AuthSession> {
  const body = await getApiClient().post<unknown>(
    "/api/auth/google/",
    { idToken: googleIdToken },
    { auth: false }
  );
  return toAuthSession(body);
}

export async function fetchMeOnApi(): Promise<UserProfile> {
  return toUserProfile(await getApiClient().get<unknown>("/api/users/me/"));
}

/** Roles held by the signed-in user, across every shop they belong to. */
export async function fetchMyRolesOnApi(): Promise<UserRole[]> {
  const body = await getApiClient().get<unknown>("/api/v1/user-roles/", {
    query: { mine: true },
  });
  return unwrapList<unknown>(body).map(toUserRole);
}

export interface ProfileUpdate {
  displayName?: string;
  phone?: string;
  accountType?: UserProfile["accountType"];
  defaultWorkspace?: UserProfile["defaultWorkspace"];
}

export async function updateMeOnApi(patch: ProfileUpdate): Promise<UserProfile> {
  const payload: Record<string, string> = {};
  if (patch.displayName !== undefined) payload.display_name = patch.displayName;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.accountType !== undefined) payload.account_type = patch.accountType;
  if (patch.defaultWorkspace !== undefined) payload.default_workspace = patch.defaultWorkspace;
  const body = await getApiClient().patch<unknown>("/api/users/me/", payload);
  return toUserProfile(body);
}

export async function updatePasswordOnApi(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await getApiClient().post<unknown>("/api/users/me/password/", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

/** Sign out: the JWT pair is the session, so dropping it is enough. */
export function logoutOnApi(): void {
  clearApiTokens();
}
