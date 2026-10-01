import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addWishlistItem,
  deleteWishlistItem,
  deleteWishlistItems,
  fromApiWishlistItem,
  isWishlisted,
  listWishlistItems,
  toggleWishlistItemOnApi,
} from "@/lib/api/domains/wishlist";

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

describe("fromApiWishlistItem", () => {
  it("normalizes a full row", () => {
    const item = fromApiWishlistItem({
      id: "w-1",
      productId: "prod-1",
      name: "Soda Crate",
      price: "12000.00",
      shopId: "shop-1",
      shopName: "Mama Shop",
      wholesalePrice: "10000.00",
      moq: 6,
      addedAt: "2026-09-30T06:00:00Z",
    });

    expect(item.productId).toBe("prod-1");
    expect(item.price).toBe(12000);
    expect(item.wholesalePrice).toBe(10000);
    expect(item.moq).toBe(6);
    expect(item.addedAt).toBe("2026-09-30T06:00:00Z");
  });

  it("reads snake_case keys and falls back to the row id", () => {
    const item = fromApiWishlistItem({
      id: "prod-2",
      name: "Unga",
      shop_id: "shop-2",
      shop_name: "Juma Traders",
      created_at: "2026-09-29T09:00:00Z",
    });

    expect(item.productId).toBe("prod-2");
    expect(item.shopId).toBe("shop-2");
    expect(item.shopName).toBe("Juma Traders");
    expect(item.addedAt).toBe("2026-09-29T09:00:00Z");
  });

  it("leaves absent numbers undefined rather than zero", () => {
    const item = fromApiWishlistItem({ productId: "p-1", wholesale_price: "", moq: null });

    expect(item.wholesalePrice).toBeUndefined();
    expect(item.moq).toBeUndefined();
    expect(item.price).toBe(0);
  });

  it("tolerates a null payload", () => {
    expect(fromApiWishlistItem(null).productId).toBe("");
  });
});

describe("listWishlistItems", () => {
  it("walks the page links and normalizes the rows", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/wishlist/?page=2&page_size=200",
        results: [{ productId: "p1" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ product_id: "p2" }] });

    const rows = await listWishlistItems();

    expect(rows.map((r) => r.productId)).toEqual(["p1", "p2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/wishlist/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/wishlist/?page=2&page_size=200", undefined);
  });
});

describe("isWishlisted", () => {
  it("filters by product id and reports membership", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [{ productId: "p-1" }] });

    await expect(isWishlisted("p-1")).resolves.toBe(true);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/wishlist/", {
      query: { product_id: "p-1", page_size: 200 },
    });
  });

  it("reports false for an empty envelope or a bare array", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });
    await expect(isWishlisted("p-2")).resolves.toBe(false);

    clientMock.get.mockResolvedValueOnce([]);
    await expect(isWishlisted("p-3")).resolves.toBe(false);
  });
});

describe("addWishlistItem", () => {
  it("posts the snapshot and normalizes the saved row", async () => {
    clientMock.post.mockResolvedValueOnce({
      productId: "p-1",
      name: "Soda Crate",
      price: 12000,
      shopId: "shop-1",
      shopName: "Mama Shop",
    });

    const item = await addWishlistItem({
      productId: "p-1",
      name: "Soda Crate",
      price: 12000,
      shopId: "shop-1",
      shopName: "Mama Shop",
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/wishlist/", {
      productId: "p-1",
      name: "Soda Crate",
      price: 12000,
      shopId: "shop-1",
      shopName: "Mama Shop",
    });
    expect(item.productId).toBe("p-1");
    expect(item.price).toBe(12000);
  });
});

describe("toggleWishlistItemOnApi", () => {
  it("resolves the new state from the server", async () => {
    clientMock.post.mockResolvedValueOnce({ added: true });

    await expect(toggleWishlistItemOnApi({ productId: "p-1", name: "Soda", price: 1, shopId: "s", shopName: "S" })).resolves.toBe(
      true
    );
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/wishlist/toggle/", {
      productId: "p-1",
      name: "Soda",
      price: 1,
      shopId: "s",
      shopName: "S",
    });

    clientMock.post.mockResolvedValueOnce({ added: false });
    await expect(toggleWishlistItemOnApi({ productId: "p-1", name: "Soda", price: 1, shopId: "s", shopName: "S" })).resolves.toBe(
      false
    );
  });

  it("treats a malformed answer as not-added", async () => {
    clientMock.post.mockResolvedValueOnce(null);

    await expect(toggleWishlistItemOnApi({ productId: "p-1", name: "S", price: 1, shopId: "s", shopName: "S" })).resolves.toBe(
      false
    );
  });
});

describe("deletes", () => {
  it("removes one row by the encoded product id", async () => {
    clientMock.del.mockResolvedValueOnce(null);

    await deleteWishlistItem("prod/1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/wishlist/prod%2F1/");
  });

  it("bulk-deletes and resolves the number of rows actually removed", async () => {
    clientMock.post.mockResolvedValueOnce({ deleted: 2 });

    await expect(deleteWishlistItems(["p-1", "p-2"])).resolves.toBe(2);
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/wishlist/bulk-delete/", {
      productIds: ["p-1", "p-2"],
    });
  });

  it("falls back to zero when the count is missing", async () => {
    clientMock.post.mockResolvedValueOnce(null);

    await expect(deleteWishlistItems(["p-1"])).resolves.toBe(0);
  });
});
