import { describe, expect, it, vi } from "vitest";
import { buildQueryString, buildUrl, createApiClient, unwrapList } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

function createFetch(responses: Response[], calls: Array<{ url: string; init: RequestInit }>) {
  return vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("Unexpected extra fetch call");
    return next;
  });
}

const tokenProvider = {
  getAccessToken: async () => "access-token",
  refreshAccessToken: async () => "refreshed-token",
};

describe("query and URL building", () => {
  it("skips empty values and repeats array keys", () => {
    expect(
      buildQueryString({ shopId: "s1", page: 2, active: true, skip: undefined, blank: "", rows: [1, 2] })
    ).toBe("?shopId=s1&page=2&active=true&rows=1&rows=2");
  });

  it("returns no query string when everything is skipped", () => {
    expect(buildQueryString({ a: undefined, b: null, c: "" })).toBe("");
    expect(buildQueryString(undefined)).toBe("");
  });

  it("joins a relative path onto the base URL", () => {
    expect(buildUrl("http://127.0.0.1:8000", "api/v1/shops/")).toBe(
      "http://127.0.0.1:8000/api/v1/shops/"
    );
    expect(buildUrl("", "/api/v1/shops/")).toBe("/api/v1/shops/");
  });
});

describe("createApiClient", () => {
  it("GETs with auth headers and no body", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createApiClient({
      baseUrl: "http://api.test",
      getAccessToken: tokenProvider.getAccessToken,
      fetchImpl: createFetch([jsonResponse([{ id: "a" }])], calls),
    });

    const data = await client.get<Array<{ id: string }>>("/api/v1/shops/", {
      query: { mine: true },
    });

    expect(data).toEqual([{ id: "a" }]);
    expect(calls[0].url).toBe("http://api.test/api/v1/shops/?mine=true");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.body).toBeUndefined();
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-token");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("POSTs a JSON body with Content-Type", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: tokenProvider.getAccessToken,
      fetchImpl: createFetch([jsonResponse({ id: "new" }, 201)], calls),
    });

    const created = await client.post<{ id: string }>("/api/v1/shops/", { name: "Duka" });

    expect(created).toEqual({ id: "new" });
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.body).toBe(JSON.stringify({ name: "Duka" }));
    expect((calls[0].init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });

  it("omits the Authorization header for public calls", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: tokenProvider.getAccessToken,
      fetchImpl: createFetch([jsonResponse([])], calls),
    });

    await client.get("/api/v1/storefront/", { auth: false });

    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("sends FormData as-is without a JSON Content-Type", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: tokenProvider.getAccessToken,
      fetchImpl: createFetch([jsonResponse({ url: "http://api.test/media/a.jpg" }, 201)], calls),
    });
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));

    await client.post("/api/v1/uploads/", form);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(calls[0].init.body).toBe(form);
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer access-token");
  });

  it("retries once with a refreshed token after a 401", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const refresh = vi.fn(async () => "refreshed-token");
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: async () => "stale-token",
      refreshAccessToken: refresh,
      fetchImpl: createFetch(
        [
          jsonResponse({ detail: "Given token not valid for any token type" }, 401),
          jsonResponse({ id: "ok" }),
        ],
        calls
      ),
    });

    await expect(client.get("/api/v1/shops/")).resolves.toEqual({ id: "ok" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe(
      "Bearer refreshed-token"
    );
  });

  it("reports the 401 when the refresh cannot produce a token", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: async () => "stale-token",
      refreshAccessToken: async () => null,
      fetchImpl: createFetch([jsonResponse({ detail: ["Not authenticated."] }, 401)], calls),
    });

    const error = (await client.get("/api/v1/shops/").catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it("does not retry 401s on unauthenticated calls", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const refresh = vi.fn(async () => "refreshed-token");
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: tokenProvider.getAccessToken,
      refreshAccessToken: refresh,
      fetchImpl: createFetch([jsonResponse({ detail: ["Not authenticated."] }, 401)], calls),
    });

    await expect(client.get("/api/v1/storefront/", { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("raises ApiError with the DRF detail envelope on validation failures", async () => {
    const client = createApiClient({
      baseUrl: "",
      fetchImpl: createFetch(
        [jsonResponse({ detail: ["Cannot pay more than the outstanding balance."] }, 400)],
        []
      ),
    });

    const error = (await client
      .post("/api/v1/suppliers/1/record_payment/", { amount: 999 })
      .catch((e) => e)) as ApiError;

    expect(error.status).toBe(400);
    expect(error.detail).toEqual(["Cannot pay more than the outstanding balance."]);
    expect(error.message).toBe("Cannot pay more than the outstanding balance.");
  });

  it("returns null for 204 responses", async () => {
    const client = createApiClient({
      baseUrl: "",
      fetchImpl: createFetch([jsonResponse(null, 204)], []),
    });

    await expect(client.del("/api/v1/invitations/1/")).resolves.toBeNull();
  });

  it("unwraps the paginated envelope when asked", async () => {
    const page = { count: 1, next: null, previous: null, results: [{ id: "a", totalAmount: "9.50" }] };
    const client = createApiClient({
      baseUrl: "",
      fetchImpl: createFetch([jsonResponse(page)], []),
    });

    const rows = await client.get<Array<{ id: string; totalAmount: number }>>("/api/v1/sales/", {
      unwrapList: true,
    });

    expect(rows).toEqual([{ id: "a", totalAmount: 9.5 }]);
  });

  it("coerces money strings inside nested responses", async () => {
    const client = createApiClient({
      baseUrl: "",
      fetchImpl: createFetch(
        [jsonResponse({ id: "s1", amount_due: "1200.00", phone: "0712345678" })],
        []
      ),
    });

    await expect(client.get("/api/v1/customers/1/")).resolves.toEqual({
      id: "s1",
      amount_due: 1200,
      phone: "0712345678",
    });
  });

  it("wraps transport failures in a network ApiError", async () => {
    const client = createApiClient({
      baseUrl: "",
      fetchImpl: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    const error = (await client.get("/api/v1/shops/").catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetworkError).toBe(true);
    expect(error.status).toBe(0);
  });

  it("refuses absolute URLs so the token cannot leak to another origin", async () => {
    const client = createApiClient({ baseUrl: "", fetchImpl: vi.fn() });

    await expect(client.get("https://evil.example/api/v1/shops/")).rejects.toThrow(
      /must be relative/
    );
  });

  it("reports a broken token exchange as a network error", async () => {
    const client = createApiClient({
      baseUrl: "",
      getAccessToken: async () => {
        throw new TypeError("Failed to fetch");
      },
      fetchImpl: vi.fn(),
    });

    const error = (await client.get("/api/v1/shops/").catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetworkError).toBe(true);
    expect(error.detail).toEqual(["Failed to fetch"]);
  });
});

describe("unwrapList", () => {
  it("accepts a DRF page or a bare array", () => {
    expect(unwrapList({ results: [1, 2] })).toEqual([1, 2]);
    expect(unwrapList([1, 2])).toEqual([1, 2]);
  });

  it("returns an empty array for anything else", () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList({ count: 0, results: null })).toEqual([]);
  });
});
