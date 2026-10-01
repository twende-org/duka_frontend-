import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelOrder,
  countPendingOrders,
  createOrder,
  deleteOrder,
  fromApiOrder,
  getOrders,
  payOrder,
  updateOrderFulfillmentStatus,
} from "@/lib/api/domains/orders";
import type { Order } from "@/types";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiOrder", () => {
  it("prefers the legacy id and normalizes money, dates and item lines", () => {
    const order = fromApiOrder({
      id: "uuid-1",
      legacyId: "ordLegacy1",
      shopId: "shop1",
      branchId: "branch1",
      status: "pending",
      subtotal: "3000.00",
      tax: 0,
      discount: "0.00",
      totalAmount: "3000.00",
      profitEstimate: "1000.00",
      paymentMethod: "Cash",
      customerName: "Mama Asha",
      customerId: "cust-fs-1",
      createdAt: "2026-09-29T10:00:00Z",
      fulfillment: { deliveryMethod: "pickup" },
      items: [
        {
          productId: "prod-fs-9",
          productName: "Crate",
          quantity: "2",
          pickedQty: "1",
          unitPrice: "1500.00",
          subtotal: "3000.00",
        },
        "junk",
      ],
    });

    expect(order.id).toBe("ordLegacy1");
    expect(order.subtotal).toBe(3000);
    expect(order.totalAmount).toBe(3000);
    expect(order.profitEstimate).toBe(1000);
    expect(order.paymentMethod).toBe("Cash");
    expect(order.customerId).toBe("cust-fs-1");
    expect(order.fulfillment).toEqual({ deliveryMethod: "pickup" });
    expect(order.items).toEqual([
      {
        productId: "prod-fs-9",
        productName: "Crate",
        quantity: 2,
        pickedQty: 1,
        price: 1500,
        subtotal: 3000,
      },
    ]);
  });

  it("keeps the legacy ``price`` spelling and falls back to a pending status", () => {
    const order = fromApiOrder({
      id: "uuid-2",
      items: [{ productId: "p1", quantity: 1, price: 500 }],
    });

    expect(order.id).toBe("uuid-2");
    expect(order.status).toBe("pending");
    expect(order.items[0].price).toBe(500);
    expect(order.items[0].pickedQty).toBeUndefined();
    expect(order.customerId).toBeNull();
    expect(order.branchId).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    expect(fromApiOrder(null).id).toBe("");
    expect(fromApiOrder(null).items).toEqual([]);
  });
});

describe("getOrders", () => {
  it("walks DRF page links and scopes the query to the shop", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/orders/?page=2&page_size=200",
        results: [{ id: "o1", status: "pending" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "o2", legacyId: "ord-fs-2" }] });

    const orders = await getOrders("shop1");

    expect(orders.map((o) => o.id)).toEqual(["o1", "ord-fs-2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/orders/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/orders/?page=2&page_size=200",
      undefined
    );
  });

  it("narrows to a branch only when one is named", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await getOrders("shop1", "branch-fs-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/orders/", {
      query: { shop_id: "shop1", page_size: 200, branch_id: "branch-fs-1" },
    });
  });
});

describe("countPendingOrders", () => {
  it("reads DRF's count off a one-row pending page", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 4, results: [{ id: "o1" }] });

    await expect(countPendingOrders("shop1")).resolves.toBe(4);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/orders/", {
      query: { shop_id: "shop1", status: "pending", page_size: 1 },
    });
  });

  it("falls back to zero when the payload has no usable count", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await expect(countPendingOrders("shop1")).resolves.toBe(0);
  });
});

describe("order writes", () => {
  it("creates through the API and returns the server row", async () => {
    clientMock.post.mockResolvedValue({
      id: "uuid-9",
      orderId: "uuid-9",
      legacyId: "ord-fs-9",
      shopId: "shop1",
      status: "pending",
      totalAmount: 3000,
      items: [{ productId: "p1", productName: "Crate", quantity: 2, unitPrice: 1500, subtotal: 3000 }],
    });

    const created = await createOrder("shop1", {
      shopId: "shop1",
      items: [{ productId: "p1", productName: "Crate", quantity: 2, price: 1500, subtotal: 3000 }],
      subtotal: 3000,
      tax: 0,
      discount: 0,
      totalAmount: 3000,
      status: "pending",
      idempotencyKey: "key-1",
      internalNotes: undefined,
    } as unknown as Omit<Order, "id"> & { idempotencyKey?: string });

    expect(created.id).toBe("ord-fs-9");
    expect(created.status).toBe("pending");
    expect(created.items[0].price).toBe(1500);
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/orders/", {
      shopId: "shop1",
      items: [{ productId: "p1", productName: "Crate", quantity: 2, price: 1500, subtotal: 3000 }],
      subtotal: 3000,
      tax: 0,
      discount: 0,
      totalAmount: 3000,
      status: "pending",
      idempotencyKey: "key-1",
    });
  });

  it("pays by the app-visible id and omits an absent shift", async () => {
    clientMock.post.mockResolvedValue({});

    await payOrder("shop1", "ord-fs-1", "Cash");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/pay/", {
      paymentMethod: "Cash",
    });
  });

  it("sends the shift id when the caller knows one", async () => {
    clientMock.post.mockResolvedValue({});

    await payOrder("shop1", "ord-fs-1", "Taslimu", "shift-uuid-1");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/pay/", {
      paymentMethod: "Taslimu",
      shiftId: "shift-uuid-1",
    });
  });

  it("cancels through update_status so the service-side restock runs", async () => {
    clientMock.patch.mockResolvedValue({});

    await cancelOrder("shop1", "ord-fs-1");

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/update_status/", {
      status: "cancelled",
    });
  });

  it("deletes through the API", async () => {
    clientMock.del.mockResolvedValue(null);

    await deleteOrder("shop1", "ord-fs-1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/");
  });

  it("patches fulfillment details and the picking rows the dialog sends", async () => {
    clientMock.patch.mockResolvedValue({});

    await updateOrderFulfillmentStatus(
      "shop1",
      "ord-fs-1",
      "packed",
      { packedBy: "Asha" },
      [
        { productId: "prod-fs-9", productName: "Crate", quantity: 2, pickedQty: 2, price: 1500, subtotal: 3000 },
        { productId: "prod-fs-10", productName: "Sugar", quantity: 1, price: 500, subtotal: 500 },
      ]
    );

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/update_status/", {
      status: "packed",
      fulfillmentData: { packedBy: "Asha" },
      items: [
        { productId: "prod-fs-9", pickedQty: 2 },
        { productId: "prod-fs-10" },
      ],
    });
  });

  it("omits items entirely when the transition sends none", async () => {
    clientMock.patch.mockResolvedValue({});

    await updateOrderFulfillmentStatus("shop1", "ord-fs-1", "confirmed");

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/orders/ord-fs-1/update_status/", {
      status: "confirmed",
    });
  });
});
