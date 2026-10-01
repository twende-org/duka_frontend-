import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchShopInsights, toInsightItem, toInsightsSnapshot } from "@/lib/api/domains/insights";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("toInsightItem", () => {
  it("keeps a typed insight and defaults unknown types to info", () => {
    expect(toInsightItem({ type: "success", text: " Hongera! " })).toEqual({
      type: "success",
      text: "Hongera!",
    });
    expect(toInsightItem({ type: "warning", text: "Tahadhari." })).toEqual({
      type: "warning",
      text: "Tahadhari.",
    });
    expect(toInsightItem({ type: "bogus", text: "Ushauri." })?.type).toBe("info");
  });

  it("drops entries without usable text", () => {
    expect(toInsightItem({ type: "info", text: "   " })).toBeNull();
    expect(toInsightItem({ type: "info" })).toBeNull();
    expect(toInsightItem(null)).toBeNull();
  });
});

describe("toInsightsSnapshot", () => {
  it("coerces numbers and keeps only string low-stock labels", () => {
    expect(
      toInsightsSnapshot({
        todaySales: "1234.5",
        yesterdaySales: 10,
        todayExpenses: null,
        lowStockItems: ["Soda (2)", 7, null],
      })
    ).toEqual({
      todaySales: 1234.5,
      yesterdaySales: 10,
      todayExpenses: 0,
      lowStockItems: ["Soda (2)"],
    });
  });

  it("treats junk as zeros", () => {
    expect(toInsightsSnapshot(undefined)).toEqual({
      todaySales: 0,
      yesterdaySales: 0,
      todayExpenses: 0,
      lowStockItems: [],
    });
  });
});

describe("fetchShopInsights", () => {
  it("reads the shop endpoint and normalizes the payload", async () => {
    clientMock.get.mockResolvedValue({
      insights: [
        { type: "success", text: "Hongera! Mauzo yamepanda." },
        { type: "warning", text: "Tahadhari: angalia stoo." },
      ],
      data: { todaySales: 5000, yesterdaySales: 4000, todayExpenses: 200, lowStockItems: ["Soda (2)"] },
    });

    const result = await fetchShopInsights("shop-1", "sw");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/shops/shop-1/insights/", {
      query: { lang: "sw" },
    });
    expect(result.insights).toHaveLength(2);
    expect(result.data.todaySales).toBe(5000);
    expect(result.data.lowStockItems).toEqual(["Soda (2)"]);
  });

  it("forwards English and falls back to Swahili for anything else", async () => {
    clientMock.get.mockResolvedValue({});
    await fetchShopInsights("shop-1", "en");
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/shops/shop-1/insights/", {
      query: { lang: "en" },
    });
    await fetchShopInsights("shop-1", "fr");
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/shops/shop-1/insights/", {
      query: { lang: "sw" },
    });
  });

  it("survives an empty or malformed body", async () => {
    clientMock.get.mockResolvedValue(null);
    expect(await fetchShopInsights("shop-1", "sw")).toEqual({
      insights: [],
      data: { todaySales: 0, yesterdaySales: 0, todayExpenses: 0, lowStockItems: [] },
    });
  });

  it("propagates request failures so callers can fall back", async () => {
    clientMock.get.mockRejectedValue(new Error("boom"));
    await expect(fetchShopInsights("shop-1", "sw")).rejects.toThrow("boom");
  });
});
