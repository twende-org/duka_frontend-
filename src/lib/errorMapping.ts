/**
 * Maps API failures (Django/DRF messages and HTTP statuses, plus RTK's
 * SerializedError) to the i18n keys the UI renders with `t(...)`.
 *
 * Every store keeps `error` as a translation key, so an unrecognized failure
 * degrades to `error.unknown` rather than leaking a raw server string.
 */

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  isNetworkError?: boolean;
  detail?: string[];
}

const MESSAGE_RULES: Array<{ test: RegExp; key: string }> = [
  // DRF answers "No active account found with the given credentials" for both
  // a wrong password and an unknown email — keep the ambiguity in the copy.
  { test: /no active account found|unable to log in with provided credentials/i, key: "auth.error.invalidCredential" },
  { test: /already (exists|in use|registered)/i, key: "auth.error.emailAlreadyInUse" },
  { test: /enter a valid email/i, key: "auth.error.invalidEmail" },
  { test: /at least 6 characters|too short/i, key: "auth.error.weakPassword" },
  { test: /google sign-in is not configured/i, key: "auth.error.googleNotConfigured" },
  { test: /too many (requests|attempts)/i, key: "auth.error.tooManyRequests" },
  { test: /failed to fetch|network ?(request|error)|load failed|offline/i, key: "error.network" },
  { test: /not found/i, key: "error.notFound" },
];

/** DRF error codes (its `code` field) mapped to the same translation keys. */
const CODE_MAP: Record<string, string> = {
  not_found: "error.notFound",
  permission_denied: "error.permissionDenied",
  unauthenticated: "error.unauthenticated",
  no_active_account: "auth.error.invalidCredential",
  throttled: "auth.error.tooManyRequests",
};

function firstMessage(error: ErrorLike): string {
  if (typeof error.detail?.[0] === "string" && error.detail[0]) return error.detail[0];
  return typeof error.message === "string" ? error.message : "";
}

export function getFriendlyError(error: unknown): string {
  if (!error) return "error.unknown";

  // Already a translation key (store callers pass "auth.error.unknown" etc.).
  if (typeof error === "string" && (error.startsWith("error.") || error.startsWith("auth.error."))) {
    return error;
  }

  const value: ErrorLike = typeof error === "string" ? { message: error } : (error as ErrorLike);
  const message = firstMessage(value);

  if (value.isNetworkError) return "error.network";

  // Google token failures arrive as 401 "(error:) Invalid token: ..." — checked
  // before the status map so they don't render as an expired session.
  if (/invalid token|did not contain an email|invalid firebase token|no id token provided/i.test(message)) {
    return "auth.error.googleTokenInvalid";
  }
  // The 503 for a deployment without GOOGLE_CLIENT_ID would otherwise fall
  // into the >=500 bucket and read as an internal error.
  if (/google sign-in is not configured/i.test(message)) {
    return "auth.error.googleNotConfigured";
  }

  const status = typeof value.status === "number" ? value.status : 0;
  if (status === 401) return "error.unauthenticated";
  if (status === 403) return "error.permissionDenied";
  if (status === 404) return "error.notFound";
  if (status === 429) return "auth.error.tooManyRequests";
  if (status >= 500) return "auth.error.internalError";

  for (const rule of MESSAGE_RULES) {
    if (rule.test.test(message)) return rule.key;
  }
  if (value.code && CODE_MAP[value.code]) return CODE_MAP[value.code];

  console.warn("Unmapped error:", error);
  return "error.unknown";
}
