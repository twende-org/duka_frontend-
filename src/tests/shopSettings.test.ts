import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromApiShopSettings, getShopSettings, updateShopSettings } from "@/lib/api/domains/shopSettings";

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

describe("fromApiShopSettings", () => {
  it("maps the camelCase groups the serializer emits", () => {
    const settings = fromApiShopSettings({
      shopId: "legacy-1",
      onlineStore: { enabled: true, layout: "grid" },
      storePolicies: { returnsPolicy: "7 days" },
      socialLinks: { facebook: "https://fb.test/mama" },
      payoutDetails: { provider: "mpesa", accountNumber: "255700000000" },
      aiMarketing: { enabled: false, tone: "fun", musicVibe: "upbeat" },
      businessInfo: { tin: "123-456", licenseNumber: "LIC-1" },
    });

    expect(settings.shopId).toBe("legacy-1");
    expect(settings.onlineStore?.layout).toBe("grid");
    expect(settings.storePolicies?.returnsPolicy).toBe("7 days");
    expect(settings.socialLinks?.facebook).toBe("https://fb.test/mama");
    expect(settings.payoutDetails?.provider).toBe("mpesa");
    expect(settings.aiMarketing?.tone).toBe("fun");
    expect(settings.businessInfo?.tin).toBe("123-456");
  });

  it("falls back to the requested shop id and drops malformed groups", () => {
    const settings = fromApiShopSettings(
      { onlineStore: "nope", storePolicies: ["not", "an", "object"] },
      "legacy 2"
    );

    expect(settings.shopId).toBe("legacy 2");
    expect(settings.onlineStore).toBeUndefined();
    expect(settings.storePolicies).toBeUndefined();
    expect(settings.payoutDetails).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    expect(fromApiShopSettings(null, "legacy-3").shopId).toBe("legacy-3");
  });
});

describe("getShopSettings", () => {
  it("reads the shop's settings by the encoded app-visible id", async () => {
    clientMock.get.mockResolvedValueOnce({
      shopId: "legacy 1",
      onlineStore: { enabled: true },
      businessInfo: { tin: "", vat: "", registrationNumber: "", licenseNumber: "" },
    });

    const settings = await getShopSettings("legacy 1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/shops/legacy%201/settings/");
    expect(settings.shopId).toBe("legacy 1");
    expect(settings.onlineStore?.enabled).toBe(true);
  });

  it("keys the result on the requested shop when the payload omits shopId", async () => {
    clientMock.get.mockResolvedValueOnce({ onlineStore: { enabled: false } });

    const settings = await getShopSettings("uuid-1");

    expect(settings.shopId).toBe("uuid-1");
    expect(settings.onlineStore?.enabled).toBe(false);
  });
});

describe("updateShopSettings", () => {
  it("patches only the groups the caller passed", async () => {
    clientMock.patch.mockResolvedValueOnce({
      shopId: "legacy-1",
      payoutDetails: { provider: "airtel", accountName: "Mama Asha" },
    });

    const settings = await updateShopSettings("legacy-1", {
      payoutDetails: { provider: "airtel", accountName: "Mama Asha" },
    });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/shops/legacy-1/settings/", {
      payoutDetails: { provider: "airtel", accountName: "Mama Asha" },
    });
    expect(settings.payoutDetails?.provider).toBe("airtel");
    expect(settings.payoutDetails?.accountName).toBe("Mama Asha");
  });

  it("merges the response back over the mapper, not the request body", async () => {
    clientMock.patch.mockResolvedValueOnce({
      shopId: "legacy-1",
      storePolicies: { returnsPolicy: "14 days", shippingPolicy: "Flat 5000" },
    });

    const settings = await updateShopSettings("legacy-1", {
      storePolicies: { returnsPolicy: "14 days" },
    });

    expect(settings.storePolicies?.returnsPolicy).toBe("14 days");
    expect(settings.storePolicies?.shippingPolicy).toBe("Flat 5000");
  });
});
