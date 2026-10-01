import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    clientMock: {
      request: fn(),
      get: fn(),
      post: fn(),
      patch: fn(),
      put: fn(),
      del: fn(),
    },
  };
});

vi.mock("@/lib/api/index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/index")>()),
  getApiClient: () => clientMock,
}));

import {
  createCampaign,
  createDiscountCode,
  fromApiCampaign,
  fromApiDiscountCode,
  getCampaigns,
  getShopDiscounts,
  updateDiscountStatus,
} from "@/lib/api/domains/marketing";

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function silenceConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("fromApiDiscountCode", () => {
  it("maps the Django columns and leaves the legacy-only fields absent", () => {
    const discount = fromApiDiscountCode({
      id: "disc1",
      shopId: { legacyId: "shopLegacy01", id: "shopDbUuid" },
      code: "SAVE10",
      type: "percentage",
      value: "10.00",
      usedCount: "3",
      status: "active",
      createdAt: "2026-09-01T08:00:00Z",
    });

    expect(discount).toEqual({
      id: "disc1",
      shopId: "shopLegacy01",
      code: "SAVE10",
      type: "percentage",
      value: 10,
      usedCount: 3,
      status: "active",
      createdAt: "2026-09-01T08:00:00Z",
    });
    // Django has no column for these; "not configured" is the correct reading.
    expect("minPurchaseAmount" in discount).toBe(false);
    expect("expiryDate" in discount).toBe(false);
  });

  it("defaults an unknown type and status instead of breaking the render", () => {
    const discount = fromApiDiscountCode({ id: "d1", code: "X", type: "bogus", status: "bogus" });

    expect(discount.type).toBe("percentage");
    expect(discount.status).toBe("active");
    expect(discount.value).toBe(0);
  });
});

describe("getShopDiscounts", () => {
  it("walks DRF's page links to keep the returned-everything contract", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://localhost:8009/api/v1/discounts/?page=2&page_size=200",
        results: [{ id: "d1", code: "A" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "d2", code: "B" }] });

    const discounts = await getShopDiscounts("shop1");

    expect(discounts.map((row) => row.id)).toEqual(["d1", "d2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/discounts/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/discounts/?page=2&page_size=200", undefined);
  });

  it("resolves to [] on a failed read so Marketing.tsx never blanks", async () => {
    const error = silenceConsoleError();
    clientMock.get.mockRejectedValueOnce(new Error("502 Bad Gateway"));

    await expect(getShopDiscounts("shop1")).resolves.toEqual([]);
    expect(error).toHaveBeenCalledWith("Error fetching discounts:", expect.any(Error));
  });
});

describe("createDiscountCode", () => {
  it("posts the wizard fields in the backend's aliases", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "discNew", code: "NEW5" });

    const id = await createDiscountCode({
      shopId: "shopLegacy01",
      code: "NEW5",
      type: "fixed",
      value: 5000,
      status: "active",
    });

    expect(id).toBe("discNew");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/discounts/", {
      shopId: "shopLegacy01",
      code: "NEW5",
      type: "fixed",
      value: 5000,
      status: "active",
    });
  });
});

describe("updateDiscountStatus", () => {
  it("patches only the status by the url-encoded id", async () => {
    clientMock.patch.mockResolvedValueOnce({});

    await updateDiscountStatus("disc/Weird Id", "disabled");

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/discounts/disc%2FWeird%20Id/", {
      status: "disabled",
    });
  });
});

describe("fromApiCampaign", () => {
  it("maps the Django columns, coercing numeric metrics and resolving the promo code", () => {
    const campaign = fromApiCampaign({
      id: "camp1",
      shopId: "shopLegacy01",
      name: "Ramadan Promo",
      source: "manual",
      platform: "sms",
      status: "draft",
      reach: "1500",
      engagement: "320",
      spend: "50000.00",
      revenue: "120000.00",
      roi: "1.40",
      startDate: "2026-09-10",
      createdAt: "2026-09-01T08:00:00Z",
      audienceFilter: "vip",
      channel: "whatsapp",
      promoCodeId: { legacyId: "discLegacy01" },
    });

    expect(campaign.status).toBe("draft");
    expect(campaign.reach).toBe(1500);
    expect(campaign.engagement).toBe("320");
    expect(campaign.spend).toBe(50000);
    expect(campaign.revenue).toBe(120000);
    expect(campaign.roi).toBe(1.4);
    expect(campaign.startDate).toBe("2026-09-10");
    expect(campaign.audienceFilter).toBe("vip");
    expect(campaign.channel).toBe("whatsapp");
    expect(campaign.promoCodeId).toBe("discLegacy01");
  });

  it("defaults an unknown status and drops unrecognised filter/channel values", () => {
    const campaign = fromApiCampaign({
      id: "c1",
      status: "weird",
      audienceFilter: "aliens",
      channel: "fax",
    });

    expect(campaign.status).toBe("completed");
    expect(campaign.audienceFilter).toBeUndefined();
    expect(campaign.channel).toBeUndefined();
    expect(campaign.promoCodeId).toBeUndefined();
  });
});

describe("getCampaigns", () => {
  it("walks pagination and maps every row", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: null,
      results: [{ id: "c1", name: "One", status: "running", reach: 10 }],
    });

    const campaigns = await getCampaigns("shop1");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/campaigns/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].status).toBe("running");
    expect(campaigns[0].reach).toBe(10);
  });

  it("resolves to [] on a failed read so Reports.tsx never blanks", async () => {
    const error = silenceConsoleError();
    clientMock.get.mockRejectedValueOnce(new Error("network down"));

    await expect(getCampaigns("shop1")).resolves.toEqual([]);
    expect(error).toHaveBeenCalledWith("Error fetching campaigns:", expect.any(Error));
  });
});

describe("createCampaign", () => {
  it("posts the collected metrics with engagement stringified like the column", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "campNew" });

    const id = await createCampaign({
      shopId: "shopLegacy01",
      name: "Launch",
      source: "manual",
      platform: "sms",
      status: "running",
      reach: 200,
      engagement: 40,
      spend: 1000,
      startDate: "2026-09-29",
      audienceFilter: "all",
      channel: "sms",
    });

    expect(id).toBe("campNew");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/campaigns/", {
      shopId: "shopLegacy01",
      name: "Launch",
      source: "manual",
      platform: "sms",
      status: "running",
      reach: 200,
      engagement: "40",
      spend: 1000,
      startDate: "2026-09-29",
      audienceFilter: "all",
      channel: "sms",
    });
  });
});
