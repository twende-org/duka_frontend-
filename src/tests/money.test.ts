import { describe, expect, it } from "vitest";
import { coerceMoneyFields } from "@/lib/api/money";

describe("coerceMoneyFields", () => {
  it("turns DRF decimal strings into numbers", () => {
    const result = coerceMoneyFields({
      buyingPrice: "120.50",
      sellingPrice: "150.00",
      selling_price: "150.00",
      totalAmount: "-12.5",
    });
    expect(result).toEqual({
      buyingPrice: 120.5,
      sellingPrice: 150,
      selling_price: 150,
      totalAmount: -12.5,
    });
  });

  it("leaves digit-only non-money strings alone", () => {
    const product = {
      sku: "12345",
      barcode: "6001234567890",
      phone: "0712345678",
      pin: "0000",
      receiptNumber: "000123",
      name: "Sugar 1kg",
    };
    expect(coerceMoneyFields(product)).toEqual(product);
  });

  it("keeps non-numeric money values as-is instead of producing NaN", () => {
    expect(coerceMoneyFields({ amount: "1,200.00" })).toEqual({ amount: "1,200.00" });
    expect(coerceMoneyFields({ amount: "" })).toEqual({ amount: "" });
    expect(coerceMoneyFields({ amount: null })).toEqual({ amount: null });
    expect(coerceMoneyFields({ amount: "1e3" })).toEqual({ amount: "1e3" });
  });

  it("walks arrays and nested objects", () => {
    const page = {
      count: 2,
      results: [
        { id: "a", totalAmount: "10.00", customer: { outstanding_balance: "5.50" } },
        { id: "b", totalAmount: "0.00" },
      ],
    };
    expect(coerceMoneyFields(page)).toEqual({
      count: 2,
      results: [
        { id: "a", totalAmount: 10, customer: { outstanding_balance: 5.5 } },
        { id: "b", totalAmount: 0 },
      ],
    });
  });

  it("does not mutate the input", () => {
    const input = { amount: "3.00" };
    coerceMoneyFields(input);
    expect(input.amount).toBe("3.00");
  });

  it("passes through non-plain values untouched", () => {
    const date = new Date();
    const result = coerceMoneyFields({ createdAt: date });
    expect(result.createdAt).toBe(date);
  });
});
