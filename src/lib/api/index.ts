import { createApiClient, type ApiClient } from "./client";
import { getApiBaseUrl } from "./config";
import { createTokenProvider, type TokenProvider } from "./token";

export { ApiError, isAuthError, normalizeErrorDetail } from "./errors";
export { coerceMoneyFields, MONEY_FIELDS } from "./money";
export { getApiBaseUrl } from "./config";
export { createApiClient, unwrapList } from "./client";
export type { ApiClient, ApiClientOptions, ApiRequestOptions } from "./client";
export { createTokenProvider, decodeJwtExpiry } from "./token";
export type { TokenPair, TokenProvider } from "./token";

let client: ApiClient | null = null;
let tokens: TokenProvider | null = null;

/** DRF token cache for the current Django session (created on first use). */
export function getTokenProvider(): TokenProvider {
  if (!tokens) tokens = createTokenProvider();
  return tokens;
}

/** Shared API client bound to the current Django session. */
export function getApiClient(): ApiClient {
  if (!client) {
    const provider = getTokenProvider();
    client = createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken: () => provider.getAccessToken(),
      refreshAccessToken: () => provider.refreshAccessToken(),
    });
  }
  return client;
}

/** Remember the SimpleJWT pair returned by the auth endpoints. */
export function setApiSession(access: string, refresh: string): void {
  getTokenProvider().setTokens(access, refresh);
}

/** True while a stored token pair exists (i.e. the user is signed in). */
export function hasApiSession(): boolean {
  return getTokenProvider().hasSession();
}

/** Drop cached DRF tokens (call on sign-out). */
export function clearApiTokens(): void {
  tokens?.clearTokens();
}
