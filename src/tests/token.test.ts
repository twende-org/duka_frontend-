import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenProvider, decodeJwtExpiry } from "@/lib/api/token";

function makeJwt(expiresInSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const base64url = payload.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${base64url}.signature`;
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    raw: data,
  };
}

function createFetch(responses: Array<{ ok?: boolean; body?: unknown }>, calls: string[] = []) {
  return vi.fn(async (url: string, init: RequestInit) => {
    calls.push(`${url} ${String(init.body ?? "")}`);
    const next = responses.shift() ?? { ok: false };
    return {
      ok: next.ok ?? true,
      status: next.ok === false ? 401 : 200,
      json: async () => next.body,
    } as unknown as Response;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("decodeJwtExpiry", () => {
  it("reads the exp claim as epoch milliseconds", () => {
    const expiry = decodeJwtExpiry(makeJwt(3600));
    expect(expiry).toBeGreaterThan(Date.now() + 3_500_000);
    expect(expiry).toBeLessThan(Date.now() + 3_700_000);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtExpiry("not-a-jwt")).toBeNull();
    expect(decodeJwtExpiry("")).toBeNull();
    expect(decodeJwtExpiry("a.???  .c")).toBeNull();
  });
});

describe("createTokenProvider", () => {
  it("returns null without a stored session and makes no request", async () => {
    const fetchImpl = createFetch([]);
    const provider = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage: null });

    await expect(provider.getAccessToken()).resolves.toBeNull();
    expect(provider.hasSession()).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("serves a stored, unexpired access token without touching the network", async () => {
    const storage = memoryStorage();
    const fetchImpl = createFetch([]);
    const provider = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage });

    provider.setTokens(makeJwt(3600), "refresh-1");

    const token = await provider.getAccessToken();
    expect(token).toBeTruthy();
    expect(provider.hasSession()).toBe(true);
    await expect(provider.getAccessToken()).resolves.toBe(token);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reuses a stored token pair after a reload", async () => {
    const storage = memoryStorage();
    const fetchImpl = createFetch([]);
    const first = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage });
    const token = makeJwt(3600);
    first.setTokens(token, "refresh-1");

    const afterReload = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage });

    await expect(afterReload.getAccessToken()).resolves.toBe(token);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refreshes once the access token is about to expire", async () => {
    const calls: string[] = [];
    const fetchImpl = createFetch([{ body: { access: makeJwt(3600) } }], calls);
    const provider = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage: null });

    provider.setTokens(makeJwt(30), "refresh-1");
    const refreshed = await provider.getAccessToken();

    expect(refreshed).toBeTruthy();
    expect(calls[0]).toContain("http://api.test/api/token/refresh/");
    expect(calls[0]).toContain('{"refresh":"refresh-1"}');
    await expect(provider.getAccessToken()).resolves.toBe(refreshed);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("shares a single refresh between concurrent callers", async () => {
    const fetchImpl = createFetch([{ body: { access: makeJwt(3600) } }]);
    const provider = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage: null });

    provider.setTokens(makeJwt(30), "refresh-1");
    const [a, b] = await Promise.all([provider.getAccessToken(), provider.getAccessToken()]);

    expect(a).toBe(b);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("clears the session when the refresh token is rejected", async () => {
    const storage = memoryStorage();
    const fetchImpl = createFetch([{ ok: false }]);
    const provider = createTokenProvider({ baseUrl: "http://api.test", fetchImpl, storage });

    provider.setTokens(makeJwt(30), "dead-refresh");

    await expect(provider.getAccessToken()).resolves.toBeNull();
    expect(provider.hasSession()).toBe(false);
    expect(storage.raw.size).toBe(0);
  });

  it("forgets the stored pair on clearTokens", async () => {
    const storage = memoryStorage();
    const provider = createTokenProvider({
      baseUrl: "http://api.test",
      fetchImpl: createFetch([]),
      storage,
    });

    provider.setTokens(makeJwt(3600), "refresh-1");
    provider.clearTokens();

    expect(storage.raw.size).toBe(0);
    expect(provider.hasSession()).toBe(false);
    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it("propagates a failing refresh so callers can surface the error", async () => {
    const provider = createTokenProvider({
      baseUrl: "http://api.test",
      fetchImpl: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      storage: null,
    });

    provider.setTokens(makeJwt(30), "refresh-1");
    await expect(provider.getAccessToken()).rejects.toThrow("Failed to fetch");
    // The session survives a transport error — a later attempt can still refresh.
    expect(provider.hasSession()).toBe(true);
  });
});
