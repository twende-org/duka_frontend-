import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adjustStock,
  fromApiMovement,
  fromApiStock,
  getInventory,
  getStockMovements,
  updateStockMinLevel,
} from "@/lib/api/domains/inventory";

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

describe("fromApiStock", () => {
  it("keys the row by product id and keeps camelCase values", () => {
    const stock = fromApiStock({
      id: "uuid-inv-1",
      productId: "prodLegacy01",
      shopId: "stockShop01",
      branchId: "branchLegacy01",
      quantity: 7,
      minStock: 3,
      location: "Shelf A",
      allocatedQty: 2,
      lastUpdated: "2026-09-29T08:00:00Z",
    });

    expect(stock).toEqual({
      id: "prodLegacy01",
      productId: "prodLegacy01",
      shopId: "stockShop01",
      branchId: "branchLegacy01",
      quantity: 7,
      minStock: 3,
      location: "Shelf A",
      allocatedQty: 2,
      lastUpdated: "2026-09-29T08:00:00Z",
    });
  });

  it("defaults minStock to 5 and drops a blank location", () => {
    const stock = fromApiStock({ productId: { legacyId: "prod1" }, quantity: "4" });

    expect(stock.id).toBe("prod1");
    expect(stock.quantity).toBe(4);
    expect(stock.minStock).toBe(5);
    expect(stock.allocatedQty).toBe(0);
    expect(stock.location).toBeUndefined();
  });
});

describe("fromApiMovement", () => {
  it("mirrors the byte-for-byte fields the history tab reads", () => {
    const movement = fromApiMovement({
      id: "mov-1",
      productId: "prodLegacy01",
      productName: "Milk",
      shopId: "stockShop01",
      branchId: "branchLegacy01",
      type: "in",
      quantityChanged: 5,
      previousQty: 7,
      newQty: 12,
      reason: "Restock",
      date: "2026-09-29T08:00:00Z",
      userId: "user-1",
      userName: "Asha",
    });

    expect(movement).toEqual({
      id: "mov-1",
      productId: "prodLegacy01",
      productName: "Milk",
      shopId: "stockShop01",
      branchId: "branchLegacy01",
      type: "in",
      quantity: 5,
      previousQty: 7,
      newQty: 12,
      reason: "Restock",
      date: "2026-09-29T08:00:00Z",
      userId: "user-1",
      userName: "Asha",
    });
  });

  it("stores the quantity as a magnitude, whatever the sign of the delta", () => {
    const sale = fromApiMovement({ type: "sale", quantityChanged: -3 });
    const unknown = fromApiMovement({ type: "nonsense", quantityChanged: 2 });

    expect(sale.quantity).toBe(3);
    expect(sale.type).toBe("sale");
    expect(unknown.type).toBe("in");
  });
});

describe("getInventory", () => {
  it("walks DRF's page links and keeps the returned-everything contract", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://127.0.0.1:8009/api/v1/inventory/?page=2&page_size=200",
        results: [{ productId: "prod1", shopId: "shop1", quantity: 2 }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ productId: "prod2", shopId: "shop1", quantity: 9 }] });

    const stock = await getInventory("shop1");

    expect(stock.map((row) => row.productId)).toEqual(["prod1", "prod2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/inventory/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/inventory/?page=2&page_size=200", undefined);
  });

  it("narrows the list to a branch when asked", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await getInventory("shop1", "branchLegacy01");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/inventory/", {
      query: { shop_id: "shop1", branch_id: "branchLegacy01", page_size: 200 },
    });
  });
});

describe("getStockMovements", () => {
  it("returns oldest-first because the history tab reverses the list", async () => {
    clientMock.get.mockResolvedValueOnce({
      results: [
        { id: "mov-3", type: "out", quantityChanged: -1, date: "2026-09-29T10:00:00Z" },
        { id: "mov-2", type: "in", quantityChanged: 4, date: "2026-09-29T09:00:00Z" },
        { id: "mov-1", type: "in", quantityChanged: 2, date: "2026-09-29T08:00:00Z" },
      ],
    });

    const movements = await getStockMovements("shop1", "prodLegacy01");

    expect(movements.map((row) => row.id)).toEqual(["mov-1", "mov-2", "mov-3"]);
    expect(movements[2].quantity).toBe(1);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/inventory-movements/", {
      query: { shop_id: "shop1", product_id: "prodLegacy01", page_size: 200 },
    });
  });
});

describe("adjustStock", () => {
  const base = {
    productId: "prodLegacy01",
    productName: "Milk",
    shopId: "shop1",
    branchId: "branchLegacy01",
    reason: "Restock",
    userId: "system",
    userName: "Mtumiaji",
  } as const;

  it("signs an 'in' magnitude before POSTing to the adjust action", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await adjustStock({ ...base, type: "in", quantity: 5 });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/inventory-movements/adjust/", {
      productId: "prodLegacy01",
      branchId: "branchLegacy01",
      movementType: "in",
      quantity: 5,
      reason: "Restock",
    });
  });

  it("subtracts for out/sale and carries an adjustment's own sign", async () => {
    clientMock.post.mockResolvedValue({});

    await adjustStock({ ...base, type: "out", quantity: 3 });
    await adjustStock({ ...base, type: "adjustment", quantity: -7 });

    expect(clientMock.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/inventory-movements/adjust/",
      expect.objectContaining({ movementType: "out", quantity: -3 })
    );
    expect(clientMock.post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/inventory-movements/adjust/",
      expect.objectContaining({ movementType: "adjustment", quantity: -7 })
    );
  });

  it("omits the branch when the caller has none (product-only callers)", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await adjustStock({ ...base, branchId: undefined, type: "adjustment", quantity: 12 });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/inventory-movements/adjust/", {
      productId: "prodLegacy01",
      movementType: "adjustment",
      quantity: 12,
      reason: "Restock",
    });
  });
});

describe("updateStockMinLevel", () => {
  it("reads the row by product, then patches it by its own id", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [{ id: "uuid-inv-1", productId: "prodLegacy01" }] });
    clientMock.patch.mockResolvedValueOnce({});

    await updateStockMinLevel("shop1", "prodLegacy01", 11);

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/inventory/", {
      query: { shop_id: "shop1", product_id: "prodLegacy01", page_size: 1 },
    });
    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/inventory/uuid-inv-1/", { minStock: 11 });
  });

  it("fails when the product has no stock row", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await expect(updateStockMinLevel("shop1", "prodLegacy01", 11)).rejects.toThrow(/no stock row/i);
    expect(clientMock.patch).not.toHaveBeenCalled();
  });
});
