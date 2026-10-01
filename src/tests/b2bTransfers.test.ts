import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptStockTransfer,
  cancelStockTransfer,
  completeStockTransfer,
  createStockTransfer,
  fromApiB2BTransfer,
  getTransfers,
  mapTransferItems,
} from "@/lib/api/domains/b2bTransfers";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

const TRANSFER_ROW = {
  id: "t-1",
  fromShopId: "shop-a",
  toShopId: "shop-b",
  fromBranchId: "branch-a",
  toBranchId: "branch-b",
  status: "pending",
  reference: "TR-001",
  note: "Weekly restock",
  createdById: "u-1",
  completedById: null,
  completedAt: null,
  items: [
    {
      id: "i-1",
      productId: "p-1",
      productName: "Unga 2kg",
      sku: "UNG-2",
      unit: "ctn",
      quantity: 10,
      unitCost: "18500.00",
      receivedProductId: null,
    },
  ],
  lineCount: 1,
  totalQuantity: "10",
  createdAt: "2026-09-30T08:00:00Z",
  updatedAt: "2026-09-30T08:00:00Z",
};

describe("fromApiB2BTransfer", () => {
  it("normalizes a server row into the typed transfer shape", () => {
    const transfer = fromApiB2BTransfer(TRANSFER_ROW);

    expect(transfer.id).toBe("t-1");
    expect(transfer.fromShopId).toBe("shop-a");
    expect(transfer.toShopId).toBe("shop-b");
    expect(transfer.fromBranchId).toBe("branch-a");
    expect(transfer.toBranchId).toBe("branch-b");
    expect(transfer.status).toBe("pending");
    expect(transfer.source).toBe("manual");
    expect(transfer.reference).toBe("TR-001");
    expect(transfer.completedAt).toBeNull();
    expect(transfer.items).toHaveLength(1);
    expect(transfer.items[0]).toEqual({
      id: "i-1",
      productId: "p-1",
      productName: "Unga 2kg",
      sku: "UNG-2",
      barcode: "",
      unit: "ctn",
      quantity: 10,
      unitCost: 18500,
      receivedProductId: null,
      mappedProductId: null,
      suggestedProductId: null,
    });
    expect(transfer.lineCount).toBe(1);
    expect(transfer.totalQuantity).toBe(10);
  });

  it("exposes the buyer's mapping and sender-side suggestion per line", () => {
    const transfer = fromApiB2BTransfer({
      ...TRANSFER_ROW,
      items: [
        {
          ...TRANSFER_ROW.items[0],
          mappedProductId: "mp-9",
          mappedProductName: "Unga 2kg (mine)",
          suggestedProductId: "sp-3",
          suggestedProductName: "Unga 2kg",
        },
      ],
    });

    expect(transfer.items[0].mappedProductId).toBe("mp-9");
    expect(transfer.items[0].mappedProductName).toBe("Unga 2kg (mine)");
    expect(transfer.items[0].suggestedProductId).toBe("sp-3");
    expect(transfer.items[0].suggestedProductName).toBe("Unga 2kg");
  });

  it("marks POS-staged manifests as sale-sourced with barcode snapshots", () => {
    const transfer = fromApiB2BTransfer({
      ...TRANSFER_ROW,
      source: "sale",
      items: [{ ...TRANSFER_ROW.items[0], barcode: "AZM-BRC-1" }],
    });

    expect(transfer.source).toBe("sale");
    expect(transfer.items[0].barcode).toBe("AZM-BRC-1");
  });

  it("falls back to safe defaults for malformed rows", () => {
    const transfer = fromApiB2BTransfer(null);

    expect(transfer.id).toBe("");
    expect(transfer.status).toBe("pending");
    expect(transfer.items).toEqual([]);
    expect(transfer.lineCount).toBe(0);
    expect(transfer.completedAt).toBeNull();
  });

  it("coerces unknown statuses and missing units", () => {
    const transfer = fromApiB2BTransfer({
      ...TRANSFER_ROW,
      status: "mystery",
      items: [{ id: "i-2", productId: "p-2", productName: "Sukari", quantity: 3, unitCost: 0 }],
    });

    expect(transfer.status).toBe("pending");
    expect(transfer.items[0].unit).toBe("pcs");
  });
});

describe("getTransfers", () => {
  it("requests shop-scoped rows with direction and status filters", async () => {
    clientMock.get.mockResolvedValue({ results: [TRANSFER_ROW], next: null });

    const transfers = await getTransfers("shop-b", { direction: "incoming", status: "pending" });

    expect(transfers).toHaveLength(1);
    expect(transfers[0].id).toBe("t-1");
    const [path, opts] = clientMock.get.mock.calls[0];
    expect(path).toBe("/api/v1/transfers/");
    expect(opts).toEqual({
      query: { shop_id: "shop-b", page_size: 200, direction: "incoming", status: "pending" },
    });
  });

  it("omits filters that were not requested", async () => {
    clientMock.get.mockResolvedValue({ results: [], next: null });

    await getTransfers("shop-b");

    expect(clientMock.get.mock.calls[0][1]).toEqual({
      query: { shop_id: "shop-b", page_size: 200 },
    });
  });

  it("walks DRF pagination via the next link", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        results: [{ ...TRANSFER_ROW, id: "t-1" }],
        next: "http://api.test/api/v1/transfers/?shop_id=shop-b&page=2",
      })
      .mockResolvedValueOnce({ results: [{ ...TRANSFER_ROW, id: "t-2" }], next: null });

    const transfers = await getTransfers("shop-b");

    expect(transfers.map((t) => t.id)).toEqual(["t-1", "t-2"]);
    expect(clientMock.get).toHaveBeenCalledTimes(2);
    expect(clientMock.get.mock.calls[1][0]).toBe("/api/v1/transfers/?shop_id=shop-b&page=2");
    expect(clientMock.get.mock.calls[1][1]).toBeUndefined();
  });
});

describe("mutations", () => {
  it("createStockTransfer posts the input unchanged", async () => {
    clientMock.post.mockResolvedValue(TRANSFER_ROW);
    const input = {
      fromShopId: "shop-a",
      toShopId: "shop-b",
      fromBranchId: "branch-a",
      toBranchId: "branch-b",
      reference: "TR-001",
      note: "Weekly restock",
      items: [{ productId: "p-1", quantity: 10, unitCost: 18500 }],
    };

    const transfer = await createStockTransfer(input);

    expect(transfer.id).toBe("t-1");
    const [path, body] = clientMock.post.mock.calls[0];
    expect(path).toBe("/api/v1/transfers/");
    expect(body).toEqual(input);
  });

  it("completeStockTransfer posts to the completion action", async () => {
    clientMock.post.mockResolvedValue({ ...TRANSFER_ROW, status: "completed" });

    const transfer = await completeStockTransfer("t-1");

    expect(transfer.status).toBe("completed");
    expect(clientMock.post.mock.calls[0][0]).toBe("/api/v1/transfers/t-1/complete/");
  });

  it("acceptStockTransfer posts to the one-tap accept action", async () => {
    clientMock.post.mockResolvedValue({ ...TRANSFER_ROW, status: "completed" });

    const transfer = await acceptStockTransfer("t-9");

    expect(transfer.status).toBe("completed");
    expect(clientMock.post.mock.calls[0][0]).toBe("/api/v1/transfers/t-9/accept/");
  });

  it("mapTransferItems posts itemId/productId pairs to the map action", async () => {
    clientMock.post.mockResolvedValue({
      ...TRANSFER_ROW,
      items: [{ ...TRANSFER_ROW.items[0], mappedProductId: "mp-9" }],
    });

    const transfer = await mapTransferItems("t-1", [{ itemId: "i-1", productId: "mp-9" }]);

    expect(transfer.items[0].mappedProductId).toBe("mp-9");
    const [path, body] = clientMock.post.mock.calls[0];
    expect(path).toBe("/api/v1/transfers/t-1/map/");
    expect(body).toEqual({ items: [{ itemId: "i-1", productId: "mp-9" }] });
  });

  it("mapTransferItems sends null to clear a mapping", async () => {
    clientMock.post.mockResolvedValue(TRANSFER_ROW);

    await mapTransferItems("t-1", [{ itemId: "i-1", productId: null }]);

    expect(clientMock.post.mock.calls[0][0]).toBe("/api/v1/transfers/t-1/map/");
    expect(clientMock.post.mock.calls[0][1]).toEqual({
      items: [{ itemId: "i-1", productId: null }],
    });
  });

  it("cancelStockTransfer posts to the cancel action", async () => {
    clientMock.post.mockResolvedValue({ ...TRANSFER_ROW, status: "cancelled" });

    const transfer = await cancelStockTransfer("t-1");

    expect(transfer.status).toBe("cancelled");
    expect(clientMock.post.mock.calls[0][0]).toBe("/api/v1/transfers/t-1/cancel/");
  });
});
