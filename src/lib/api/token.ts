import { getApiBaseUrl } from "./config";

/**
 * Session token cache for the Django API.
 *
 * Sign-in happens directly against Django — Google Identity Services or
 * email/password — and every auth route answers with a SimpleJWT pair. This
 * provider stores that pair (sessionStorage) and refreshes the access token
 * before it expires, so authenticated calls survive a page reload.
 */

export interface TokenPair {
  access: string;
  refresh: string;
  /** Epoch milliseconds derived from the access token's exp claim. */
  accessExpiresAt: number;
}

export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  refreshAccessToken(): Promise<string | null>;
  /** Store the pair returned by /api/auth/{login,register,google}/. */
  setTokens(access: string, refresh: string): void;
  clearTokens(): void;
  /** True while a stored pair exists (i.e. the user is signed in). */
  hasSession(): boolean;
}

const TOKEN_STORAGE_KEY = "biashara.drf_tokens";
/** Refresh this many ms before the real expiry to absorb clock skew. */
const EXPIRY_SKEW_MS = 60_000;

function createStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    void window.sessionStorage.length; // Throws where storage access is blocked.
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Read the exp claim from a JWT's payload without verifying the signature. */
export function decodeJwtExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = atob(padded);
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function createTokenProvider(options: {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
} = {}): TokenProvider {
  const baseUrl = options.baseUrl ?? getApiBaseUrl();
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const storage = options.storage === undefined ? createStorage() : options.storage;

  let cached: TokenPair | null = readStored();
  let refreshInFlight: Promise<string | null> | null = null;

  function readStored(): TokenPair | null {
    if (!storage) return null;
    try {
      const raw = storage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TokenPair;
      if (!parsed?.access || !parsed?.refresh) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function store(pair: TokenPair | null): void {
    cached = pair;
    if (!storage) return;
    try {
      if (pair) storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(pair));
      else storage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* Storage full or blocked — the in-memory cache still works. */
    }
  }

  function isFresh(pair: TokenPair | null): boolean {
    if (!pair?.access) return false;
    const expiresAt = pair.accessExpiresAt || decodeJwtExpiry(pair.access) || 0;
    return Date.now() < expiresAt - EXPIRY_SKEW_MS;
  }

  async function post(path: string, payload: unknown): Promise<unknown> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function refreshOnce(): Promise<string | null> {
    if (!cached?.refresh) return null;
    const data = (await post("/api/token/refresh/", { refresh: cached.refresh })) as {
      access?: string;
    } | null;
    if (!data?.access) {
      // The refresh token is dead too: drop the session so callers can sign in.
      store(null);
      return null;
    }
    const pair: TokenPair = {
      access: data.access,
      refresh: cached.refresh,
      accessExpiresAt: decodeJwtExpiry(data.access) ?? Date.now() + 5 * 60_000,
    };
    store(pair);
    return pair.access;
  }

  return {
    async getAccessToken() {
      if (isFresh(cached)) return cached!.access;
      if (!cached?.refresh) return null;
      if (!refreshInFlight) {
        refreshInFlight = refreshOnce().finally(() => {
          refreshInFlight = null;
        });
      }
      return refreshInFlight;
    },

    async refreshAccessToken() {
      if (!cached?.refresh) return null;
      if (!refreshInFlight) {
        refreshInFlight = refreshOnce().finally(() => {
          refreshInFlight = null;
        });
      }
      return refreshInFlight;
    },

    setTokens(access, refresh) {
      store({
        access,
        refresh,
        accessExpiresAt: decodeJwtExpiry(access) ?? Date.now() + 5 * 60_000,
      });
    },

    clearTokens() {
      store(null);
    },

    hasSession() {
      return Boolean(cached?.access || cached?.refresh);
    },
  };
}
