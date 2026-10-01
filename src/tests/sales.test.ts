import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDraftSale,
  addSaleWithSummary,
  confirmDraftSale,
  deleteDraftSale,
  fromApiSale,
  fromApiSaleItem,
  fromApiSummary,
  getDailySummary,
  getSalesByDate,
  getSummariesForRange,
} from "@/lib/api/domains/sales";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiSale", () => {
  it("re-derives the flat POS fields from the cart lines", () => {
    const sale = fromApiSale({
      id: "uuid-sale-1",
      legacyId: "saleLegacy01",
      shopId: { legacyId: "shop1" },
      branchId: "branchLegacy01",
      items: [
        { productId: "p1", productName: "Milk", quantity: 2, price: 4500, subtotal: 9000 },
        { productId: "p2", productName: "Sugar", quantity: 1, price: 3000, subtotal: 3000 },
      ],
      totalAmount: "12000.00",
      paymentMethod: "Taslimu",
      date: "2026-09-29",
      status: "completed",
      shiftId: "shiftLegacy01",
    });

    expect(sale.id).toBe("saleLegacy01");
    expect(sale.productName).toBe("Milk +1");
    expect(sale.quantity).toBe(3);
    expect(sale.totalPrice).toBe(12000);
    expect(sale.items).toHaveLength(2);
    expect(sale.items?.[0]).toEqual({
      productId: "p1",
      productName: "Milk",
      quantity: 2,
      price: 4500,
      subtotal: 9000,
    });
    expect(sale.shiftId).toBe("shiftLegacy01");
  });

  it("falls back to a single line and the Taslimu default", () => {
    const sale = fromApiSale({
      id: "sale-2",
      items: [{ productId: "p1", productName: "Bread", quantity: "1", unitPrice: "1500", totalPrice: "1500" }],
      totalPrice: "1500.00",
    });

    expect(sale.productName).toBe("Bread");
    expect(sale.quantity).toBe(1);
    expect(sale.paymentMethod).toBe("Taslimu");
    expect(sale.status).toBe("completed");
    expect(sale.items?.[0].price).toBe(1500);
  });

  it("keeps a draft draft and tolerates an empty cart", () => {
    const sale = fromApiSale({ id: "sale-3", status: "draft", items: [] });

    expect(sale.status).toBe("draft");
    expect(sale.productName).toBe("");
    expect(sale.quantity).toBe(0);
    expect(sale.items).toBeUndefined();
  });
});

describe("fromApiSaleItem / fromApiSummary", () => {
  it("reads both alias spellings", () => {
    expect(fromApiSaleItem({ productId: { id: "p9" }, quantity: "2", price: "100", subtotal: "200" })).toEqual({
      productId: "p9",
      productName: "",
      quantity: 2,
      price: 100,
      subtotal: 200,
    });

    expect(
      fromApiSummary({ date: "2026-09-29", total_sales: "9000", transactions: 3, profit: "2000", total_expenses: "500", net_profit: "1500" })
    ).toEqual({
      date: "2026-09-29",
      totalSales: 9000,
      transactions: 3,
      profit: 2000,
      totalExpenses: 500,
      netProfit: 1500,
    });
  });
});

describe("getSalesByDate", () => {
  it("walks DRF's absolute next links back to a flat list", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://127.0.0.1:8009/api/v1/sales/?page=2&shop_id=shop1",
        results: [{ id: "s1" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "s2" }] });

    const sales = await getSalesByDate("shop1", "2026-09-29", "branch1");

    expect(sales.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/sales/", {
      query: { shop_id: "shop1", date: "2026-09-29", page_size: 200, branch_id: "branch1" },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/sales/?page=2&shop_id=shop1", undefined);
  });
});

describe("summaries", () => {
  it("returns null when the shop never traded that day", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, results: [] });

    await expect(getDailySummary("shop1", "2026-09-29")).resolves.toBeNull();
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/sales/summaries/", {
      query: { shop_id: "shop1", date: "2026-09-29" },
    });
  });

  it("maps the single summary row and the range rows", async () => {
    clientMock.get.mockResolvedValueOnce([
      { date: "2026-09-29", totalSales: "5000", transactions: 2, profit: "1200", totalExpenses: "300", netProfit: "900" },
    ]);

    const day = await getDailySummary("shop1", "2026-09-29");
    expect(day?.netProfit).toBe(900);

    clientMock.get.mockResolvedValueOnce({ results: [{ date: "2026-09-28" }] });
    const range = await getSummariesForRange("shop1", "2026-09-01", "2026-09-29");
    expect(range).toHaveLength(1);
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/sales/summaries/", {
      query: { shop_id: "shop1", date_from: "2026-09-01", date_to: "2026-09-29" },
    });
  });
});

describe("sale writes", () => {
  it("posts the cart with the discounted subtotal as the line total", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "uuid-1", legacyId: "saleLegacy9" });

    const id = await addSaleWithSummary(
      {
        shopId: "shop1",
        branchId: "branch1",
        productId: "p1",
        productName: "Milk",
        quantity: 2,
        totalPrice: 9000,
        paymentMethod: "Taslimu",
        date: "2026-09-29",
        shopName: "Duka",
        items: [{ productId: "p1", productName: "Milk", quantity: 2, price: 4500, subtotal: 8550 }],
      },
      2700
    );

    expect(id).toBe("saleLegacy9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/sales/", {
      shopId: "shop1",
      branchId: "branch1",
      paymentMethod: "Taslimu",
      status: "completed",
      items: [{ productId: "p1", quantity: 2, price: 4500, subtotal: 8550 }],
    });
  });

  it("synthesizes a line for legacy callers without a cart and omits blank optionals", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "sale-2" });

    await addDraftSale({
      shopId: "shop1",
      branchId: "",
      productId: "p1",
      productName: "Milk",
      quantity: 2,
      totalPrice: 9000,
      paymentMethod: "Taslimu",
      date: "2026-09-29",
      shopName: "Duka",
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/sales/", {
      shopId: "shop1",
      paymentMethod: "Taslimu",
      status: "draft",
      items: [{ productId: "p1", quantity: 2, price: 4500, subtotal: 9000 }],
    });
  });

  it("confirms and deletes drafts through the detail routes", async () => {
    clientMock.post.mockResolvedValueOnce({});
    clientMock.del.mockResolvedValueOnce({});

    await confirmDraftSale("shop1", "2026-09-29", "saleLegacy9", 2700);
    expect(clientMock.post).toHaveBeenLastCalledWith("/api/v1/sales/saleLegacy9/confirm/", {});

    await deleteDraftSale("shop1", "2026-09-29", "saleLegacy9");
    expect(clientMock.del).toHaveBeenLastCalledWith("/api/v1/sales/saleLegacy9/");
  });
});
