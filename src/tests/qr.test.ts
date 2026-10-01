import { describe, expect, it } from "vitest";
import { productHintsFromQrPayload } from "@/lib/qr";

describe("productHintsFromQrPayload", () => {
  it("reads a barcode-number QR into the barcode hint", () => {
    expect(productHintsFromQrPayload("6001234567890")).toEqual({ barcode: "6001234567890" });
  });

  it("reads a plain product-name QR into the name hint", () => {
    expect(productHintsFromQrPayload("Sukari Kilima 1kg")).toEqual({ name: "Sukari Kilima 1kg" });
    expect(productHintsFromQrPayload("  Sabuni Kidopo  \n")).toEqual({ name: "Sabuni Kidopo" });
  });

  it("derives a readable name from a storefront URL", () => {
    expect(productHintsFromQrPayload("https://duka.co.tz/p/sabuni-ya-nguo_500ml")).toEqual({
      name: "sabuni ya nguo 500ml",
    });
    expect(productHintsFromQrPayload("https://duka.co.tz/products/Sukari-1KG.jpg")).toEqual({
      name: "Sukari 1KG",
    });
  });

  it("rejects payloads that are not a single readable product", () => {
    expect(productHintsFromQrPayload("")).toBeNull();
    expect(productHintsFromQrPayload('{"type":"twendeduka.wholesale.v1","items":[]}')).toBeNull();
    expect(productHintsFromQrPayload("<xml/>")).toBeNull();
    expect(productHintsFromQrPayload("x".repeat(301))).toBeNull();
    expect(productHintsFromQrPayload("https://duka.co.tz/")).toBeNull();
  });
});
