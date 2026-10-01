import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchActivityLogs,
  fetchErrorEvents,
  fetchGlobalAnalyticsSummary,
  fetchShopAnalyticsSummary,
  fromApiActivityLog,
  fromApiErrorEvent,
  fromApiGlobalSummary,
  fromApiShopSummary,
  writeActivityLog,
  writeAnalyticsEvent,
  writeErrorEvent,
} from "@/lib/api/domains/telemetry";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/index")>()),
  getApiClient: () => clientMock,
}));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiActivityLog", () => {
  it("normalizes a camelCase row and keeps the metadata blob", () => {
    const row = fromApiActivityLog({
      id: "log-1",
      userId: "user-1",
      userEmail: "mama@test.com",
      userName: "Mama Asha",
      role: "owner",
      shopId: "shop-1",
      action: "Sale created",
      category: "sale",
      details: "2 items, TZS 24,000",
      metadata: { saleId: "s-1" },
      createdAt: "2026-09-30T06:00:00Z",
    });

    expect(row.id).toBe("log-1");
    expect(row.shopId).toBe("shop-1");
    expect(row.metadata).toEqual({ saleId: "s-1" });
    expect(row.createdAt).toBe("2026-09-30T06:00:00Z");
  });

  it("reads snake_case keys and defaults the rest", () => {
    const row = fromApiActivityLog({
      user_id: "user-2",
      user_email: "juma@test.com",
      user_name: "Juma",
      shop_id: "shop-2",
      metadata: ["not-a-record"],
    });

    expect(row.userId).toBe("user-2");
    expect(row.userEmail).toBe("juma@test.com");
    expect(row.shopId).toBe("shop-2");
    expect(row.metadata).toBeUndefined();
    expect(row.action).toBe("");
    expect(row.createdAt).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    const row = fromApiActivityLog(null);
    expect(row.id).toBe("");
    expect(row.details).toBe("");
  });
});

describe("fromApiErrorEvent", () => {
  it("keeps optional fields undefined instead of empty strings", () => {
    const row = fromApiErrorEvent({
      id: "err-1",
      action: "checkout",
      error_message: "Network request failed",
      category: "network",
    });

    expect(row.errorMessage).toBe("Network request failed");
    expect(row.userId).toBeUndefined();
    expect(row.errorCode).toBeUndefined();
    expect(row.route).toBeUndefined();
  });

  it("normalizes a full row", () => {
    const row = fromApiErrorEvent({
      id: "err-2",
      userId: "user-1",
      errorCode: "auth/invalid",
      route: "/app/login",
      action: "login",
      errorMessage: "Bad token",
      category: "auth",
    });

    expect(row.userId).toBe("user-1");
    expect(row.errorCode).toBe("auth/invalid");
    expect(row.route).toBe("/app/login");
  });
});

describe("fetchActivityLogs", () => {
  it("sends the shop and user filters with the page size", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "l1" }] });

    const rows = await fetchActivityLogs({ shopId: "shop-1", userId: "user-1", maxResults: 25 });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/activity-logs/", {
      query: { page_size: 200, shop_id: "shop-1", user_id: "user-1" },
    });
    expect(rows).toHaveLength(1);
  });

  it("walks the page links and stops at the requested limit", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/activity-logs/?page=2&page_size=200",
        results: [{ id: "l1" }, { id: "l2" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "l3" }, { id: "l4" }] });

    const rows = await fetchActivityLogs({ maxResults: 3 });

    expect(rows.map((r) => r.id)).toEqual(["l1", "l2", "l3"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/activity-logs/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/activity-logs/?page=2&page_size=200",
      undefined
    );
  });
});

describe("writes", () => {
  it("appends an audit row with an empty metadata default", async () => {
    clientMock.post.mockResolvedValue({ id: "log-9" });

    await writeActivityLog({
      role: "owner",
      shopId: "shop-1",
      action: "Expense added",
      category: "expense",
      details: "Umeme 20,000",
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/activity-logs/", {
      role: "owner",
      shopId: "shop-1",
      action: "Expense added",
      category: "expense",
      details: "Umeme 20,000",
      metadata: {},
    });
  });

  it("keeps caller metadata when provided", async () => {
    clientMock.post.mockResolvedValue({ id: "log-10" });

    await writeActivityLog({
      role: "manager",
      shopId: "shop-1",
      action: "Product updated",
      category: "product",
      details: "Soda",
      metadata: { productId: "p-1" },
    });

    expect(clientMock.post.mock.calls[0][1].metadata).toEqual({ productId: "p-1" });
  });

  it("fires a storefront event without a session and blanks a null userId", async () => {
    clientMock.post.mockResolvedValue(null);

    await writeAnalyticsEvent({
      eventType: "product_view",
      deviceId: "dev-1",
      url: "/shop/mama-shop",
      userId: null,
      productId: "p-1",
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/analytics-events/", {
      eventType: "product_view",
      deviceId: "dev-1",
      url: "/shop/mama-shop",
      userId: "",
      productId: "p-1",
    });
  });

  it("files a crash report with the caller payload untouched", async () => {
    clientMock.post.mockResolvedValue(null);

    await writeErrorEvent({ action: "checkout", errorMessage: "Boom", category: "crash" });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/error-events/", {
      action: "checkout",
      errorMessage: "Boom",
      category: "crash",
    });
  });
});

describe("fetchErrorEvents", () => {
  it("walks the pages and normalizes the rows", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/error-events/?page=2",
        results: [{ id: "e1", action: "a" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "e2", error_message: "late" }] });

    const rows = await fetchErrorEvents(300);

    expect(rows.map((r) => r.id)).toEqual(["e1", "e2"]);
    expect(rows[1].errorMessage).toBe("late");
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/error-events/?page=2", undefined);
  });
});

describe("analytics summaries", () => {
  it("coerces a shop summary and defaults missing counters to zero", () => {
    expect(
      fromApiShopSummary({ visits: 12, productViews: 40, whatsappClicks: 3, followers: 7 })
    ).toEqual({ visits: 12, productViews: 40, whatsappClicks: 3, followers: 7 });
    expect(fromApiShopSummary({})).toEqual({
      visits: 0,
      productViews: 0,
      whatsappClicks: 0,
      followers: 0,
    });
    expect(fromApiShopSummary(null).visits).toBe(0);
  });

  it("keeps only well-formed top searches", () => {
    const summary = fromApiGlobalSummary({
      totalSearches: 30,
      totalWhatsAppClicks: 5,
      totalShopVisits: 12,
      topSearches: [{ query: "sukari", count: 4 }, "junk", { query: "unga" }],
    });

    expect(summary.totalSearches).toBe(30);
    expect(summary.topSearches).toEqual([
      { query: "sukari", count: 4 },
      { query: "unga", count: 0 },
    ]);
  });

  it("reads the shop funnel with the window", async () => {
    clientMock.get.mockResolvedValueOnce({ visits: 9, followers: 2 });

    const summary = await fetchShopAnalyticsSummary("shop-1", 7);

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/analytics/shop-summary/", {
      query: { shop_id: "shop-1", days: 7 },
    });
    expect(summary).toEqual({ visits: 9, productViews: 0, whatsappClicks: 0, followers: 2 });
  });

  it("reads the platform funnel with the window", async () => {
    clientMock.get.mockResolvedValueOnce({ totalSearches: 100 });

    const summary = await fetchGlobalAnalyticsSummary(30);

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/analytics/global-summary/", {
      query: { days: 30 },
    });
    expect(summary.totalSearches).toBe(100);
    expect(summary.topSearches).toEqual([]);
  });
});
