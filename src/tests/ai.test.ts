import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_REPLY,
  askBusinessAssistant,
  extractProductDetailsFromImage,
  extractProductDetailsListFromImage,
  toProductDetails,
} from "@/lib/api/domains/ai";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("askBusinessAssistant", () => {
  it("posts the message, shop and context to the assistant endpoint", async () => {
    clientMock.post.mockResolvedValue({ reply: "Mauzo yako ni mazuri leo." });

    const reply = await askBusinessAssistant("Duka Jema", "Habari", { todaySales: 1500 });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/ai/assistant/", {
      message: "Habari",
      shopName: "Duka Jema",
      context: { todaySales: 1500 },
    });
    expect(reply).toBe("Mauzo yako ni mazuri leo.");
  });

  it("sends an empty context object when none was given", async () => {
    clientMock.post.mockResolvedValue({ reply: "Sawa." });

    await askBusinessAssistant("Duka", "Habari", undefined);

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/ai/assistant/", {
      message: "Habari",
      shopName: "Duka",
      context: {},
    });
  });

  it("falls back to the legacy line when the answer is empty", async () => {
    clientMock.post.mockResolvedValue({});

    expect(await askBusinessAssistant("Duka", "Habari", {})).toBe(FALLBACK_REPLY);
  });

  it("re-throws the legacy Swahili message on failure", async () => {
    clientMock.post.mockRejectedValue(new Error("503"));

    await expect(askBusinessAssistant("Duka", "Habari", {})).rejects.toThrow(
      "Kuna tatizo kuunganisha na Twende AI kwa sasa. Tafadhali jaribu tena baadaye."
    );
  });
});

describe("toProductDetails", () => {
  it("keeps only the known fields, trimmed", () => {
    expect(
      toProductDetails({
        name: " Sabuni ",
        brand: "Azam",
        description: "Sabuni ya kufulia",
        barcode: " 12345 ",
        unit: "pcs",
        price: 500,
      })
    ).toEqual({
      name: "Sabuni",
      brand: "Azam",
      description: "Sabuni ya kufulia",
      barcode: "12345",
      unit: "pcs",
    });
  });

  it("drops blank and non-string values", () => {
    expect(toProductDetails({ name: "   ", brand: null, unit: 7 })).toEqual({});
    expect(toProductDetails(undefined)).toEqual({});
    expect(toProductDetails("nope")).toEqual({});
  });

  it("keeps extended string fields, finite numbers and string extras", () => {
    expect(
      toProductDetails({
        name: "Sukari",
        category: " Beverages ",
        size: "500ml",
        weight: "500g",
        color: "Blue",
        expiryDate: "2027-01-31",
        buyingPrice: 3500,
        sellingPrice: "4000",
        quantity: Number.NaN,
        extra: { flavour: " Vanilla ", memo: 7, empty: "  " },
      })
    ).toEqual({
      name: "Sukari",
      category: "Beverages",
      size: "500ml",
      weight: "500g",
      color: "Blue",
      expiryDate: "2027-01-31",
      buyingPrice: 3500,
      extra: { flavour: "Vanilla" },
    });
  });
});

describe("extractProductDetailsFromImage", () => {
  it("posts the image and unwraps the details", async () => {
    clientMock.post.mockResolvedValue({
      details: { name: "Sabuni", barcode: "12345" },
    });

    const details = await extractProductDetailsFromImage("data:image/jpeg;base64,AAA");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/ai/extract-product/", {
      image: "data:image/jpeg;base64,AAA",
    });
    expect(details).toEqual({ name: "Sabuni", barcode: "12345" });
  });

  it("tolerates a malformed body", async () => {
    clientMock.post.mockResolvedValue(null);

    expect(await extractProductDetailsFromImage("data:image/jpeg;base64,AAA")).toEqual({});
  });

  it("re-throws the legacy extraction message on failure", async () => {
    clientMock.post.mockRejectedValue(new Error("502"));

    await expect(extractProductDetailsFromImage("data:image/jpeg;base64,AAA")).rejects.toThrow(
      "Failed to extract details from image."
    );
  });
});

describe("extractProductDetailsListFromImage", () => {
  it("posts the image and returns name-bearing details only", async () => {
    clientMock.post.mockResolvedValue({
      details: [{ name: "Sabuni", barcode: "1" }, { brand: "NoName" }, "junk"],
    });

    const list = await extractProductDetailsListFromImage("data:image/jpeg;base64,AAA");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/ai/extract-products/", {
      image: "data:image/jpeg;base64,AAA",
    });
    expect(list).toEqual([{ name: "Sabuni", barcode: "1" }]);
  });

  it("returns an empty list for a malformed body", async () => {
    clientMock.post.mockResolvedValue(null);

    expect(await extractProductDetailsListFromImage("data:image/jpeg;base64,AAA")).toEqual([]);
  });

  it("re-throws the legacy extraction message on failure", async () => {
    clientMock.post.mockRejectedValue(new Error("502"));

    await expect(extractProductDetailsListFromImage("data:image/jpeg;base64,AAA")).rejects.toThrow(
      "Failed to extract details from image."
    );
  });
});
