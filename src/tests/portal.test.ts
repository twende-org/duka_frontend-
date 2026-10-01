import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fromApiPortalOrder,
  fromApiPortalReceipt,
  getCustomerOrders,
  getCustomerReceipts,
} from "@/lib/api/domains/portal";
import { ApiError } from "@/lib/api/errors";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiPortalOrder", () => {
  it("keeps the legacy ids and normalizes numbers and items", () => {
    const order = fromApiPortalOrder({
      id: "ORD-123456",
      orderId: "ORD-123456",
      shopId: "shop-1",
      shopName: "Mama Shop",
      createdAt: "2026-09-01T10:00:00Z",
      totalAmount: "1600.00",
      status: "out_for_delivery",
      source: "in_app",
      fulfillment: { driverName: "Juma", trackingNumber: "TR-1" },
      items: [
        { productId: "prod-1", productName: "Soda", quantity: 2, price: "800.00", subtotal: "1600.00" },
      ],
    });

    expect(order.id).toBe("ORD-123456");
    expect(order.orderId).toBe("ORD-123456");
    expect(order.shopId).toBe("shop-1");
    expect(order.totalAmount).toBe(1600);
    expect(order.status).toBe("out_for_delivery");
    expect(order.fulfillment).toEqual({ driverName: "Juma", trackingNumber: "TR-1" });
    expect(order.items).toEqual([
      { productId: "prod-1", productName: "Soda", quantity: 2, price: 800, subtotal: 1600 },
    ]);
  });

  it("tolerates a null payload and a non-object fulfillment", () => {
    const order = fromApiPortalOrder(null);
    expect(order.id).toBe("");
    expect(order.orderId).toBe("");
    expect(order.totalAmount).toBe(0);
    expect(order.status).toBe("pending");
    expect(order.fulfillment).toBeUndefined();
    expect(order.items).toEqual([]);

    expect(fromApiPortalOrder({ fulfillment: "pickup" }).fulfillment).toBeUndefined();
  });

  it("drops non-object item rows instead of crashing the page", () => {
    const order = fromApiPortalOrder({ items: [null, 7] });
    expect(order.items).toEqual([
      { productId: undefined, productName: "", quantity: 1, price: 0, subtotal: 0 },
      { productId: undefined, productName: "", quantity: 1, price: 0, subtotal: 0 },
    ]);
  });
});

describe("fromApiPortalReceipt", () => {
  it("normalizes the receipt document shape", () => {
    const receipt = fromApiPortalReceipt({
      id: "sale-1",
      shopId: "shop-1",
      shopName: "Mama Shop",
      date: "2026-09-01",
      total: "1600.00",
      paymentMethod: "cash",
      itemsCount: 2,
      createdAt: "2026-09-01T10:00:00Z",
      items: [{ productName: "Soda", quantity: 2, price: 800, subtotal: 1600 }],
    });

    expect(receipt.id).toBe("sale-1");
    expect(receipt.total).toBe(1600);
    expect(receipt.paymentMethod).toBe("cash");
    expect(receipt.itemsCount).toBe(2);
    expect(receipt.items[0].price).toBe(800);
  });

  it("falls back to the item count when the payload omits one", () => {
    const receipt = fromApiPortalReceipt({ id: "sale-2", items: [{ productName: "A" }, { productName: "B" }] });
    expect(receipt.itemsCount).toBe(2);
    expect(fromApiPortalReceipt(null).itemsCount).toBe(0);
  });
});

describe("getCustomerOrders", () => {
  it("reads the authenticated endpoint and walks DRF page links", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/portal/orders/?page=2&page_size=200",
        results: [{ id: "o1", orderId: "o1", totalAmount: 100, items: [] }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "o2", orderId: "o2", totalAmount: "50.00" }] });

    const orders = await getCustomerOrders("portal-uid");

    // No `auth: false`: the bridge must attach the JWT (and exchange it first
    // when needed), because identity is derived from the caller server-side.
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/portal/orders/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/portal/orders/?page=2&page_size=200",
      { query: undefined }
    );
    expect(orders.map((o) => o.id)).toEqual(["o1", "o2"]);
    expect(orders[1].totalAmount).toBe(50);
  });

  it("propagates authentication failures", async () => {
    clientMock.get.mockRejectedValueOnce(new ApiError("Authentication credentials were not provided.", { status: 401 }));

    await expect(getCustomerOrders("portal-uid")).rejects.toThrow("Authentication credentials");
  });
});

describe("getCustomerReceipts", () => {
  it("reads the authenticated endpoint and maps receipts", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: null,
      results: [
        { id: "s1", shopName: "Mama Shop", date: "2026-09-01", total: 1600, paymentMethod: "cash", itemsCount: 1, items: [] },
      ],
    });

    const receipts = await getCustomerReceipts("portal-uid");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/portal/receipts/", {
      query: { page_size: 200 },
    });
    expect(receipts[0].shopName).toBe("Mama Shop");
    expect(receipts[0].total).toBe(1600);
  });

  it("returns an empty list for a payload with no results", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });

    await expect(getCustomerReceipts("portal-uid")).resolves.toEqual([]);
  });
});
