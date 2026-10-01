import { describe, it, expect, vi, beforeEach } from "vitest";

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
  fromApiB2BOrder,
  fromApiShipment,
  fromApiGRN,
  fromApiSupplierBalance,
  fromApiSupplierInvoice,
  fromApiSupplierPayment,
  getBuyerB2BOrders,
  getSupplierB2BOrders,
  createB2BPurchaseOrder,
  updateB2BOrderStatus,
  getShipmentsForPO,
  createB2BShipment,
  updateB2BShipmentStatus,
  getGRNsForPO,
  processGRNTransaction,
  getBuyerSupplierBalances,
  getBuyerInvoices,
  getBuyerPayments,
  createB2BSupplierInvoice,
  updateB2BSupplierInvoiceStatus,
  processSupplierPayment,
} from "@/lib/api/domains/b2b";

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiB2BOrder", () => {
  it("maps a camelCase row and keeps the timeline the service appended", () => {
    const order = fromApiB2BOrder({
      id: "poUuid",
      buyerShopId: "shopLegacy01",
      supplierShopId: "supplierShopLegacy02",
      supplierName: "Kariakoo Wholesalers",
      status: "partially_received",
      items: [
        {
          productId: "prodLegacy01",
          productName: "Sugar 50kg",
          expectedQty: 10,
          receivedQty: 4,
          buyingPrice: 62000,
          subtotal: 620000,
        },
      ],
      subtotal: 620000,
      totalAmount: 620000,
      currency: "TZS",
      notes: null,
      timeline: [
        { status: "draft", description: "Purchase order created with status: draft", timestamp: "2026-09-01T10:00:00Z" },
      ],
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-02T10:00:00Z",
    });

    expect(order.id).toBe("poUuid");
    expect(order.buyerShopId).toBe("shopLegacy01");
    expect(order.status).toBe("partially_received");
    expect(order.notes).toBeUndefined();
    expect(order.items[0]).toEqual({
      productId: "prodLegacy01",
      sourceProductId: undefined,
      productName: "Sugar 50kg",
      expectedQty: 10,
      receivedQty: 4,
      buyingPrice: 62000,
      discountAmount: undefined,
      taxAmount: undefined,
      subtotal: 620000,
    });
    expect(order.timeline).toHaveLength(1);
    expect(order.timeline?.[0].status).toBe("draft");
  });

  it("returns safe defaults for an empty row", () => {
    const order = fromApiB2BOrder({});

    expect(order.id).toBe("");
    expect(order.status).toBe("draft");
    expect(order.items).toEqual([]);
    expect(order.timeline).toEqual([]);
    expect(order.totalAmount).toBe(0);
    expect(order.createdAt).toBe("");
  });
});

describe("fromApiShipment", () => {
  it("maps logistics fields and coerces nullable strings", () => {
    const shipment = fromApiShipment({
      id: "shipUuid",
      poId: "poUuid",
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      status: "in_transit",
      carrier: "Tunduma Express",
      driverName: null,
      trackingNumber: "TRK-9",
      items: [{ productId: "p1", productName: "Rice", shippedQty: 5 }],
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-01T10:00:00Z",
    });

    expect(shipment.poId).toBe("poUuid");
    expect(shipment.status).toBe("in_transit");
    expect(shipment.carrier).toBe("Tunduma Express");
    expect(shipment.driverName).toBeUndefined();
    expect(shipment.items[0]).toEqual({
      productId: "p1",
      sourceProductId: undefined,
      productName: "Rice",
      shippedQty: 5,
    });
  });
});

describe("fromApiGRN", () => {
  it("maps the GRN the wizard receives back", () => {
    const grn = fromApiGRN({
      id: "grnUuid",
      poId: "poUuid",
      shipmentId: null,
      shopId: "buyerLegacy",
      supplierId: "supplierLegacy",
      supplierName: "Kariakoo Wholesalers",
      status: "completed",
      items: [
        { productId: "p1", expectedQty: 5, receivedQty: 4, acceptedQty: 4, rejectedQty: 0, unitCost: 1000 },
      ],
      completedAt: "2026-09-03T10:00:00Z",
      createdAt: "2026-09-03T10:00:00Z",
    });

    expect(grn.id).toBe("grnUuid");
    expect(grn.shipmentId).toBeUndefined();
    expect(grn.supplierName).toBe("Kariakoo Wholesalers");
    expect(grn.items[0].acceptedQty).toBe(4);
    expect(grn.items[0].unitCost).toBe(1000);
  });
});

describe("fromApiSupplierBalance", () => {
  it("maps the AP row the dashboard sums", () => {
    const balance = fromApiSupplierBalance({
      id: "balanceUuid",
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      totalPurchases: 3,
      receivedGoodsValue: 125000,
      outstandingBalance: 105000,
      paidAmount: 20000,
      updatedAt: "2026-09-03T10:00:00Z",
    });

    expect(balance).toEqual({
      id: "balanceUuid",
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      totalPurchases: 3,
      receivedGoodsValue: 125000,
      outstandingBalance: 105000,
      paidAmount: 20000,
      updatedAt: "2026-09-03T10:00:00Z",
    });
  });
});

describe("fromApiSupplierInvoice", () => {
  it("maps dates, grnIds and money fields", () => {
    const invoice = fromApiSupplierInvoice({
      id: "invUuid",
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      purchaseOrderId: "poUuid",
      grnIds: ["grnUuid"],
      invoiceNumber: "INV-001",
      invoiceDate: "2026-09-03",
      dueDate: null,
      currency: "TZS",
      subtotal: 125000,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 125000,
      status: "under_review",
      createdAt: "2026-09-03T10:00:00Z",
      updatedAt: "2026-09-03T10:00:00Z",
    });

    expect(invoice.grnIds).toEqual(["grnUuid"]);
    expect(invoice.invoiceDate).toBe("2026-09-03");
    expect(invoice.dueDate).toBe("");
    expect(invoice.totalAmount).toBe(125000);
    expect(invoice.status).toBe("under_review");
  });
});

describe("fromApiSupplierPayment", () => {
  it("maps the recorded payment", () => {
    const payment = fromApiSupplierPayment({
      id: "payUuid",
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      amount: 50000,
      method: "Mobile Money",
      reference: "MPESA-77",
      invoiceIds: ["invUuid"],
      date: "2026-09-04T09:00:00Z",
      notes: null,
      createdAt: "2026-09-04T09:00:00Z",
    });

    expect(payment.amount).toBe(50000);
    expect(payment.method).toBe("Mobile Money");
    expect(payment.invoiceIds).toEqual(["invUuid"]);
    expect(payment.notes).toBeUndefined();
  });
});

describe("getBuyerB2BOrders", () => {
  it("asks for the buyer role and walks pagination", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        count: 2,
        next: "http://localhost:8009/api/v1/purchases/orders/?page=2&page_size=200",
        results: [{ id: "po1", status: "draft" }],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        results: [{ id: "po2", status: "submitted" }],
      });

    const orders = await getBuyerB2BOrders("buyerLegacy");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/purchases/orders/", {
      query: { shop_id: "buyerLegacy", role: "buyer", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/purchases/orders/?page=2&page_size=200"
    );
    expect(orders.map((order) => order.id)).toEqual(["po1", "po2"]);
  });
});

describe("getSupplierB2BOrders", () => {
  it("asks for the supplier role", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 1, next: null, results: [{ id: "po1" }] });

    await getSupplierB2BOrders("supplierLegacy");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/purchases/orders/", {
      query: { shop_id: "supplierLegacy", role: "supplier", page_size: 200 },
    });
  });
});

describe("createB2BPurchaseOrder", () => {
  it("posts the camelCase payload without subtotal and returns the created id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "poNew", status: "draft" });

    const id = await createB2BPurchaseOrder({
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      supplierName: "Kariakoo Wholesalers",
      status: "draft",
      items: [
        {
          productId: "p1",
          productName: "Sugar 50kg",
          expectedQty: 10,
          receivedQty: 0,
          buyingPrice: 62000,
          subtotal: 620000,
        },
      ],
      subtotal: 620000,
      totalAmount: 620000,
      currency: "TZS",
      notes: "Deliver before Friday",
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/purchases/orders/", {
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      items: [
        {
          productId: "p1",
          productName: "Sugar 50kg",
          expectedQty: 10,
          buyingPrice: 62000,
          receivedQty: 0,
        },
      ],
      supplierName: "Kariakoo Wholesalers",
      status: "draft",
      currency: "TZS",
      notes: "Deliver before Friday",
    });
    expect(id).toBe("poNew");
  });
});

describe("updateB2BOrderStatus", () => {
  it("omits notes when the caller passed undefined", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await updateB2BOrderStatus("po/Weird Id", "approved");

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/purchases/orders/po%2FWeird%20Id/update_status/",
      { status: "approved" }
    );
  });

  it("sends an empty notes string when the caller rewrote it to empty", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await updateB2BOrderStatus("po1", "cancelled", "");

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/purchases/orders/po1/update_status/",
      { status: "cancelled", notes: "" }
    );
  });
});

describe("getShipmentsForPO", () => {
  it("filters by the PO id", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 1,
      next: null,
      results: [{ id: "ship1", poId: "po1", status: "preparing", items: [] }],
    });

    const shipments = await getShipmentsForPO("po1");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/purchases/shipments/", {
      query: { po_id: "po1", page_size: 200 },
    });
    expect(shipments[0].poId).toBe("po1");
  });
});

describe("createB2BShipment", () => {
  it("posts the logistics fields and returns the created id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "shipNew", poId: "po1", status: "dispatched" });

    const id = await createB2BShipment({
      poId: "po1",
      supplierShopId: "supplierLegacy",
      buyerShopId: "buyerLegacy",
      status: "dispatched",
      carrier: "Tunduma Express",
      driverName: "Juma",
      trackingNumber: "TRK-9",
      items: [{ productId: "p1", productName: "Sugar 50kg", shippedQty: 10, sourceProductId: "src1" }],
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/purchases/shipments/", {
      poId: "po1",
      supplierShopId: "supplierLegacy",
      items: [
        { productId: "p1", productName: "Sugar 50kg", shippedQty: 10, sourceProductId: "src1" },
      ],
      status: "dispatched",
      carrier: "Tunduma Express",
      driverName: "Juma",
      trackingNumber: "TRK-9",
    });
    expect(id).toBe("shipNew");
  });
});

describe("updateB2BShipmentStatus", () => {
  it("posts the status transition with notes when given", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await updateB2BShipmentStatus("ship1", "delivered", "Signed by Mwangi");

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/purchases/shipments/ship1/update_status/",
      { status: "delivered", notes: "Signed by Mwangi" }
    );
  });
});

describe("getGRNsForPO", () => {
  it("filters by the PO id and maps rows", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 1,
      next: null,
      results: [{ id: "grn1", poId: "po1", status: "completed", items: [] }],
    });

    const grns = await getGRNsForPO("po1");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/purchases/grns/", {
      query: { po_id: "po1", page_size: 200 },
    });
    expect(grns[0]).toMatchObject({ id: "grn1", poId: "po1", status: "completed", items: [] });
  });
});

describe("processGRNTransaction", () => {
  it("posts the wizard payload to process_grn and returns the GRN id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "grnNew", status: "completed" });

    const id = await processGRNTransaction({
      poId: "po1",
      shipmentId: "ship1",
      shopId: "buyerLegacy",
      supplierId: "supplierLegacy",
      supplierName: "Kariakoo Wholesalers",
      status: "completed",
      items: [
        {
          productId: "p1",
          productName: "Sugar 50kg",
          expectedQty: 10,
          receivedQty: 10,
          acceptedQty: 9,
          rejectedQty: 1,
          unitCost: 62000,
        },
      ],
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/purchases/orders/process_grn/", {
      poId: "po1",
      shopId: "buyerLegacy",
      supplierId: "supplierLegacy",
      shipmentId: "ship1",
      items: [
        {
          productId: "p1",
          expectedQty: 10,
          receivedQty: 10,
          acceptedQty: 9,
          rejectedQty: 1,
          unitCost: 62000,
          productName: "Sugar 50kg",
        },
      ],
    });
    expect(id).toBe("grnNew");
  });
});

describe("getBuyerSupplierBalances", () => {
  it("filters by buyer shop", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 1,
      next: null,
      results: [{ id: "b1", buyerShopId: "buyerLegacy", outstandingBalance: 105000 }],
    });

    const balances = await getBuyerSupplierBalances("buyerLegacy");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/b2b/supplier-balances/", {
      query: { buyer_shop_id: "buyerLegacy", page_size: 200 },
    });
    expect(balances[0].outstandingBalance).toBe(105000);
  });
});

describe("getBuyerInvoices", () => {
  it("filters by buyer shop", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, next: null, results: [] });

    const invoices = await getBuyerInvoices("buyerLegacy");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/b2b/supplier-invoices/", {
      query: { buyer_shop_id: "buyerLegacy", page_size: 200 },
    });
    expect(invoices).toEqual([]);
  });
});

describe("getBuyerPayments", () => {
  it("filters by buyer shop", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, next: null, results: [] });

    await getBuyerPayments("buyerLegacy");

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/b2b/supplier-payments/", {
      query: { buyer_shop_id: "buyerLegacy", page_size: 200 },
    });
  });
});

describe("createB2BSupplierInvoice", () => {
  it("posts the dialog payload and returns the created id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "invNew", status: "under_review" });

    const id = await createB2BSupplierInvoice({
      supplierShopId: "supplierLegacy",
      buyerShopId: "buyerLegacy",
      purchaseOrderId: "po1",
      grnIds: ["grn1"],
      invoiceNumber: "INV-001",
      invoiceDate: "2026-09-03",
      dueDate: "2026-10-03",
      currency: "TZS",
      subtotal: 125000,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 125000,
      status: "under_review",
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/b2b/supplier-invoices/", {
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      invoiceNumber: "INV-001",
      grnIds: ["grn1"],
      invoiceDate: "2026-09-03",
      dueDate: "2026-10-03",
      currency: "TZS",
      subtotal: 125000,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 125000,
      status: "under_review",
      purchaseOrderId: "po1",
    });
    expect(id).toBe("invNew");
  });
});

describe("updateB2BSupplierInvoiceStatus", () => {
  it("posts the status transition", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await updateB2BSupplierInvoiceStatus("inv1", "approved");

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/b2b/supplier-invoices/inv1/update_status/",
      { status: "approved" }
    );
  });
});

describe("processSupplierPayment", () => {
  it("posts the payment and defaults allowOverpayment to false", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "payNew" });

    const id = await processSupplierPayment({
      supplierShopId: "supplierLegacy",
      buyerShopId: "buyerLegacy",
      amount: 50000,
      method: "Mobile Money",
      reference: "MPESA-77",
      notes: "",
      date: "2026-09-04T09:00:00Z",
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/b2b/supplier-payments/", {
      buyerShopId: "buyerLegacy",
      supplierShopId: "supplierLegacy",
      amount: 50000,
      method: "Mobile Money",
      allowOverpayment: false,
      reference: "MPESA-77",
      notes: "",
      date: "2026-09-04T09:00:00Z",
    });
    expect(id).toBe("payNew");
  });

  it("forwards the overpayment confirmation", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "payNew" });

    await processSupplierPayment(
      {
        supplierShopId: "supplierLegacy",
        buyerShopId: "buyerLegacy",
        amount: 500000,
        method: "Cash",
        date: "2026-09-04T09:00:00Z",
      },
      true
    );

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/b2b/supplier-payments/",
      expect.objectContaining({ allowOverpayment: true })
    );
  });
});
