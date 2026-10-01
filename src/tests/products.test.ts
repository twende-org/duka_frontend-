import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMerchantCategory,
  addProduct,
  deleteMerchantCategory,
  deleteProduct,
  fromApiMerchantCategory,
  fromApiProduct,
  getMerchantCategories,
  getProducts,
  getProductsPaginated,
  updateProduct,
} from "@/lib/api/domains/products";
import type { MerchantCategory, Product } from "@/types";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiProduct", () => {
  it("prefers the legacy id and normalizes money and prices", () => {
    const product = fromApiProduct({
      id: "uuid-1",
      legacyId: "legacyProd1",
      name: "Cement 50kg",
      shopId: "shopLegacy1",
      buyingPrice: "12000.00",
      sellingPrice: 14500,
      prices: [{ type: "wholesale", price: "13500.00" }, "junk"],
      moq: "5",
      tags: "",
      status: "active",
    });

    expect(product.id).toBe("legacyProd1");
    expect(product.shopId).toBe("shopLegacy1");
    expect(product.buyingPrice).toBe(12000);
    expect(product.sellingPrice).toBe(14500);
    expect(product.prices).toEqual([{ type: "wholesale", price: 13500 }]);
    expect(product.moq).toBe(5);
    expect(product.tags).toEqual([]);
  });

  it("falls back to the Django id for rows created after the cutover", () => {
    const product = fromApiProduct({ id: "uuid-2", name: "Sugar" });

    expect(product.id).toBe("uuid-2");
    expect(product.buyingPrice).toBe(0);
    expect(product.sellingPrice).toBe(0);
    expect(product.categories).toEqual([]);
    expect(product.imageUrls).toEqual([]);
    expect(product.publishToDirectory).toBe(false);
  });

  it("tolerates a null payload", () => {
    expect(fromApiProduct(null).id).toBe("");
  });
});

describe("getProducts", () => {
  it("walks DRF page links and returns every page", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/products/?page=2&page_size=200",
        results: [{ id: "p1", name: "One" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "p2", legacyId: "legacy2", name: "Two" }] });

    const products = await getProducts("shop1");

    expect(products.map((p) => p.id)).toEqual(["p1", "legacy2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/products/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/products/?page=2&page_size=200",
      undefined
    );
  });
});

describe("getProductsPaginated", () => {
  it("maps DRF pages onto the legacy cursor contract", async () => {
    clientMock.get.mockResolvedValueOnce({ next: "/next", results: [{ id: "p1", name: "One" }] });

    const first = await getProductsPaginated("shop1", 20, null);

    expect(first.products.map((p) => p.id)).toEqual(["p1"]);
    expect(first.lastDoc).toBe(1);
    expect(first.hasMore).toBe(true);
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/products/", {
      query: { shop_id: "shop1", page: 1, page_size: 20 },
    });

    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });
    const second = await getProductsPaginated("shop1", 20, first.lastDoc);

    expect(second).toEqual({ products: [], lastDoc: 2, hasMore: false });
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/products/", {
      query: { shop_id: "shop1", page: 2, page_size: 20 },
    });
  });
});

describe("product writes", () => {
  it("creates through the API and returns the app-visible id", async () => {
    clientMock.post.mockResolvedValue({
      id: "uuid-9",
      legacyId: "legacyProd9",
      name: "Sugar",
      shopId: "shop1",
      buyingPrice: 1000,
      sellingPrice: 1200,
    });

    const id = await addProduct({
      name: "Sugar",
      shopId: "shop1",
      buyingPrice: 1000,
      sellingPrice: 1200,
      supplier: "",
      note: undefined,
    } as unknown as Omit<Product, "id">);

    expect(id).toBe("legacyProd9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/products/", {
      name: "Sugar",
      shopId: "shop1",
      buyingPrice: 1000,
      sellingPrice: 1200,
      supplier: "",
    });
  });

  it("patches by the app-visible id with only the touched keys", async () => {
    clientMock.patch.mockResolvedValue({});

    await updateProduct("legacyProd9", { publishToFacebook: false });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/products/legacyProd9/", {
      publishToFacebook: false,
    });
  });

  it("deletes through the API", async () => {
    clientMock.del.mockResolvedValue(null);

    await deleteProduct("legacyProd9");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/products/legacyProd9/");
  });

  it("propagates API failures", async () => {
    clientMock.patch.mockRejectedValueOnce(new Error("boom"));

    await expect(updateProduct("legacyProd9", { name: "x" })).rejects.toThrow("boom");
  });
});

describe("merchant categories", () => {
  it("normalizes legacy and snake_case fields", () => {
    expect(
      fromApiMerchantCategory({
        id: "uuid-mc",
        legacyId: "legacyMc",
        shopId: "shop1",
        name: "Fresh Produce",
        slug: "fresh-produce",
        sort_order: 2,
        status: "active",
      })
    ).toEqual({
      id: "legacyMc",
      shopId: "shop1",
      name: "Fresh Produce",
      slug: "fresh-produce",
      sortOrder: 2,
      status: "active",
    });
  });

  it("scopes the list to the shop", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "mc1", name: "Drinks" }] });

    const categories = await getMerchantCategories("shop1");

    expect(categories.map((c) => c.id)).toEqual(["mc1"]);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/merchant-categories/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
  });

  it("adds with the shop id from the caller", async () => {
    clientMock.post.mockResolvedValue({
      id: "uuid-mc2",
      legacyId: "legacyMc2",
      shopId: "shop1",
      name: "Hardware",
      slug: "hardware",
      status: "active",
    });

    const created = await addMerchantCategory("shop1", {
      name: "Hardware",
    } as unknown as Omit<MerchantCategory, "id">);

    expect(created.id).toBe("legacyMc2");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/merchant-categories/", {
      shopId: "shop1",
      name: "Hardware",
    });
  });

  it("deletes by the app-visible id", async () => {
    clientMock.del.mockResolvedValue(null);

    await deleteMerchantCategory("shop1", "legacyMc2");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/merchant-categories/legacyMc2/");
  });
});
