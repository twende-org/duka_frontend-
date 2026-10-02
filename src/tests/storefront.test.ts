import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adjustFollowerCount,
  fromApiPublicProduct,
  fromApiShop,
  fromApiStorefrontOrder,
  getAllPublicProducts,
  getAllShops,
  getProductsByShop,
  getPublicTrendingSearches,
  getShopBySlugOrId,
  getShopProductsPage,
  getWholesaleSuppliers,
  placeWishlistOrder,
  searchPublicProducts,
  searchPublicShops,
} from "@/lib/api/domains/storefront";
import { ApiError } from "@/lib/api/errors";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiShop", () => {
  it("prefers the legacy id and normalizes the public payload", () => {
    const shop = fromApiShop({
      id: "uuid-1",
      legacyId: "shopLegacy1",
      name: "Mama Shop",
      slug: "mama-shop",
      location: "Kariakoo",
      lat: "-6.8",
      lon: 39.28,
      isPublic: true,
      followerCount: 7,
      businessCategories: ["Food", "Drinks"],
      productCondition: "both",
      country: "Tanzania",
      region: "Dar es Salaam",
      district: "Ilala",
    });

    expect(shop.id).toBe("shopLegacy1");
    expect(shop.name).toBe("Mama Shop");
    expect(shop.lat).toBe(-6.8);
    expect(shop.lon).toBe(39.28);
    expect(shop.isPublic).toBe(true);
    expect(shop.followerCount).toBe(7);
    expect(shop.businessCategories).toEqual(["Food", "Drinks"]);
    expect(shop.productCondition).toBe("both");
    expect(shop.district).toBe("Ilala");
  });

  it("keeps absent arrays undefined so consumer fallbacks still work", () => {
    const shop = fromApiShop({ id: "uuid-2", name: "Bare Shop" });

    expect(shop.businessCategories).toBeUndefined();
    expect(shop.isPublic).toBe(false);
    expect(shop.ownerId).toBe("");
    expect(shop.followerCount).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    expect(fromApiShop(null).id).toBe("");
  });
});

describe("fromApiPublicProduct", () => {
  it("blanks merchant-confidential fields even if a payload carries them", () => {
    const product = fromApiPublicProduct({
      id: "uuid-prod",
      legacyId: "prod-1",
      name: "Soda Crate",
      shopId: "shop-1",
      sellingPrice: "12000.00",
      status: "active",
      buyingPrice: "9000.00",
      supplier: "Crate Supplier",
      supplierShopId: "shop-9",
      sourceProductId: "src-1",
      taxRate: 18,
      attributes: { size: "large" },
      variants: [{ name: "x" }],
    });

    expect(product.id).toBe("prod-1");
    expect(product.sellingPrice).toBe(12000);
    expect(product.buyingPrice).toBeUndefined();
    expect(product.supplier).toBeUndefined();
    expect(product.supplierShopId).toBeUndefined();
    expect(product.sourceProductId).toBeUndefined();
    expect(product.taxRate).toBeUndefined();
    expect(product.attributes).toBeUndefined();
    expect(product.variants).toBeUndefined();
  });
});

describe("getAllShops", () => {
  it("walks DRF page links anonymously", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/public/shops/?page=2&page_size=200",
        results: [{ id: "s1", name: "One", isPublic: true }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "s2", legacyId: "legacy2", name: "Two" }] });

    const shops = await getAllShops();

    expect(shops.map((s) => s.id)).toEqual(["s1", "legacy2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/public/shops/", {
      query: { page_size: 200 },
      auth: false,
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/public/shops/?page=2&page_size=200",
      { query: undefined, auth: false }
    );
  });
});

describe("getWholesaleSuppliers", () => {
  it("filters by the wholesale flag", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "s1", name: "Supplier" }] });

    const shops = await getWholesaleSuppliers();

    expect(shops.map((s) => s.name)).toEqual(["Supplier"]);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/", {
      query: { is_wholesale_supplier: "true", page_size: 200 },
      auth: false,
    });
  });
});

describe("getAllShops with isPublic filter", () => {
  it("forwards the is_public param when requested", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await getAllShops({ isPublic: true });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/", {
      query: { page_size: 200, is_public: "true" },
      auth: false,
    });
  });
});

describe("searchPublicShops", () => {
  it("searches shops with a single anonymous page", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: "http://testserver/api/v1/public/shops/?search=soda&page=2",
      results: [{ id: "uuid-1", legacyId: "shop-1", name: "Soda World", isPublic: true }],
    });

    const shops = await searchPublicShops({ q: "soda", isPublic: true });

    expect(clientMock.get).toHaveBeenCalledTimes(1);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/", {
      query: { search: "soda", page_size: 10, is_public: "true" },
      auth: false,
    });
    expect(shops.map((s) => s.id)).toEqual(["shop-1"]);
  });

  it("scopes to wholesale suppliers with a custom page size", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await searchPublicShops({ q: "rice", isWholesaleSupplier: true, pageSize: 6 });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/", {
      query: { search: "rice", page_size: 6, is_wholesale_supplier: "true" },
      auth: false,
    });
  });
});

describe("searchPublicProducts", () => {
  it("reads one ranked page from the public search endpoint", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 40,
      next: "http://testserver/api/v1/public/products/search/?q=soda&page=2",
      results: [
        {
          id: "uuid-prod",
          legacyId: "prod-1",
          name: "Soda Crate",
          shopId: "shop-1",
          sellingPrice: "12000.00",
          stock: 5,
          minStock: 2,
          buyingPrice: "9000.00",
          supplier: "Crate Supplier",
        },
      ],
    });

    const page = await searchPublicProducts({ q: "soda" });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/products/search/", {
      query: { q: "soda", page_size: 200 },
      auth: false,
    });
    expect(page.count).toBe(40);
    expect(page.hasMore).toBe(true);
    expect(page.products[0].id).toBe("prod-1");
    expect(page.products[0].stock).toBe(5);
    expect(page.products[0].buyingPrice).toBeUndefined();
    expect(page.products[0].supplier).toBeUndefined();
  });

  it("omits page 1 and forwards shop scoping plus later pages", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, next: null, results: [] });

    const page = await searchPublicProducts({ q: "unga", shop: "mama shop/1", page: 2 });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/products/search/", {
      query: { q: "unga", page_size: 200, shop: "mama shop/1", page: 2 },
      auth: false,
    });
    expect(page.hasMore).toBe(false);
    expect(page.products).toEqual([]);
    expect(page.count).toBe(0);
  });
});

describe("getAllPublicProducts", () => {
  it("walks the cross-shop product stream anonymously, newest first", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/public/products/search/?page=2&page_size=200",
        results: [
          {
            id: "uuid-prod",
            legacyId: "prod-1",
            name: "Soda Crate",
            shopId: "shop-1",
            sellingPrice: "12000.00",
            buyingPrice: "9000.00",
            supplier: "Crate Supplier",
          },
        ],
      })
      .mockResolvedValueOnce({
        next: null,
        results: [{ id: "prod-2", name: "Rice", shopId: "shop-2", sellingPrice: "2000.00" }],
      });

    const products = await getAllPublicProducts();

    expect(products.map((p) => p.id)).toEqual(["prod-1", "prod-2"]);
    expect(products[0].buyingPrice).toBeUndefined();
    expect(products[0].supplier).toBeUndefined();
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/public/products/search/", {
      query: { page_size: 200 },
      auth: false,
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/public/products/search/?page=2&page_size=200",
      { query: undefined, auth: false }
    );
  });
});

describe("getPublicTrendingSearches", () => {
  it("maps the trending payload and drops empty queries", async () => {
    clientMock.get.mockResolvedValueOnce({
      trending: [
        { query: "Laptop", count: 12 },
        { query: "", count: 3 },
        { query: "Rice", count: "7" },
      ],
    });

    const rows = await getPublicTrendingSearches();

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/trending-searches/", {
      query: undefined,
      auth: false,
    });
    expect(rows).toEqual([
      { query: "Laptop", count: 12 },
      { query: "Rice", count: 7 },
    ]);
  });

  it("forwards the days window and tolerates a bare payload", async () => {
    clientMock.get.mockResolvedValueOnce({});

    await expect(getPublicTrendingSearches(7)).resolves.toEqual([]);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/trending-searches/", {
      query: { days: 7 },
      auth: false,
    });
  });
});

describe("getShopBySlugOrId", () => {
  it("encodes the identifier and reads anonymously", async () => {
    clientMock.get.mockResolvedValueOnce({ id: "s1", name: "Mama Shop", legacyId: "shop-1" });

    const shop = await getShopBySlugOrId("mama shop/1");

    expect(shop?.id).toBe("shop-1");
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/mama%20shop%2F1/", {
      auth: false,
    });
  });

  it("returns null when the shop does not exist", async () => {
    clientMock.get.mockRejectedValueOnce(
      new ApiError("Not found.", { status: 404, data: { detail: "Not found." } })
    );

    await expect(getShopBySlugOrId("no-such-shop")).resolves.toBeNull();
  });

  it("propagates real failures", async () => {
    clientMock.get.mockRejectedValueOnce(new ApiError("Network request failed", { isNetworkError: true }));

    await expect(getShopBySlugOrId("mama-shop")).rejects.toThrow("Network request failed");
  });
});

describe("getProductsByShop", () => {
  it("reads the shop-scoped public products with the merchant fields blanked", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: null,
      results: [
        {
          id: "uuid-prod",
          legacyId: "prod-1",
          name: "Soda",
          shopId: "shop-1",
          sellingPrice: "12000.00",
          buyingPrice: "9000.00",
          supplier: "Supplier",
        },
      ],
    });

    const products = await getProductsByShop("shop-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/shop-1/products/", {
      query: { page_size: 200 },
      auth: false,
    });
    expect(products[0].id).toBe("prod-1");
    expect(products[0].buyingPrice).toBeUndefined();
    expect(products[0].supplier).toBeUndefined();
  });
});

describe("getShopProductsPage", () => {
  it("reads one catalog page anonymously with the merchant fields blanked", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 57,
      next: "http://localhost:8009/api/v1/public/shops/shop-1/products/?page=2&page_size=48",
      results: [
        {
          id: "uuid-prod",
          legacyId: "prod-9",
          name: "Soda Crate",
          shopId: "shop-1",
          sellingPrice: "12000.00",
          buyingPrice: "9000.00",
          supplier: "Supplier",
          supplierShopId: "sup-1",
          stock: "3",
        },
      ],
    });

    const page = await getShopProductsPage("shop-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/shop-1/products/", {
      query: { page_size: 200 },
      auth: false,
    });
    expect(page.count).toBe(57);
    expect(page.hasMore).toBe(true);
    expect(page.products[0].id).toBe("prod-9");
    expect(page.products[0].buyingPrice).toBeUndefined();
    expect(page.products[0].supplier).toBeUndefined();
    expect(page.products[0].supplierShopId).toBeUndefined();
    expect(page.products[0].stock).toBe(3);
  });

  it("forwards the trimmed query, later pages and the page size", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 2, next: null, results: [] });

    const page = await getShopProductsPage("mama shop/1", {
      q: "  barcode 123 ",
      page: 3,
      pageSize: 48,
    });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/mama%20shop%2F1/products/", {
      query: { page_size: 48, search: "barcode 123", page: 3 },
      auth: false,
    });
    expect(page.count).toBe(2);
    expect(page.hasMore).toBe(false);
  });

  it("omits the search param and page 1, falling back to the row count", async () => {
    clientMock.get.mockResolvedValueOnce({
      results: [{ id: "prod-2", name: "Rice", sellingPrice: "2000.00" }],
    });

    const page = await getShopProductsPage("shop-1", { q: "   ", page: 1 });

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/public/shops/shop-1/products/", {
      query: { page_size: 200 },
      auth: false,
    });
    expect(page.count).toBe(1);
    expect(page.hasMore).toBe(false);
    expect(page.products[0].id).toBe("prod-2");
  });
});

describe("adjustFollowerCount", () => {
  it("posts follow and returns the counter", async () => {
    clientMock.post.mockResolvedValueOnce({ followerCount: 8 });

    await expect(adjustFollowerCount("shop-1", 1)).resolves.toBe(8);
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/public/shops/shop-1/follow/");
  });

  it("posts unfollow and returns the counter", async () => {
    clientMock.post.mockResolvedValueOnce({ followerCount: 6 });

    await expect(adjustFollowerCount("shop-1", -1)).resolves.toBe(6);
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/public/shops/shop-1/unfollow/");
  });

  it("propagates failures", async () => {
    clientMock.post.mockRejectedValueOnce(new ApiError("Forbidden", { status: 403 }));

    await expect(adjustFollowerCount("shop-1", 1)).rejects.toThrow("Forbidden");
  });
});

describe("fromApiStorefrontOrder", () => {
  it("normalizes the server-priced order and its money fields", () => {
    const order = fromApiStorefrontOrder({
      id: "uuid-order",
      legacyId: "ORD-123456",
      orderId: "ORD-123456",
      shopId: "shop-1",
      status: "pending",
      source: "wishlist",
      subtotal: "24000.00",
      totalAmount: "24000.00",
      paymentMethod: "Cash / WhatsApp",
      customerName: "Asha Juma",
      customerPhone: "0712000000",
      customerAddress: "Sinza, Dar es Salaam",
      notes: "Deliver in the morning",
      createdAt: "2026-09-29T10:00:00Z",
      items: [
        {
          productId: "prod-1",
          productName: "Soda Crate",
          quantity: 2,
          unitPrice: "12000.00",
          subtotal: "24000.00",
        },
      ],
    });

    expect(order.id).toBe("ORD-123456");
    expect(order.orderId).toBe("ORD-123456");
    expect(order.source).toBe("wishlist");
    expect(order.subtotal).toBe(24000);
    expect(order.totalAmount).toBe(24000);
    expect(order.customerAddress).toBe("Sinza, Dar es Salaam");
    expect(order.items).toEqual([
      { productId: "prod-1", productName: "Soda Crate", quantity: 2, unitPrice: 12000, subtotal: 24000 },
    ]);
  });

  it("falls back to the app id, the item price and empty items", () => {
    const order = fromApiStorefrontOrder({
      id: "uuid-only",
      items: [{ productName: "Unga", price: "3500.00" }],
    });

    expect(order.orderId).toBe("uuid-only");
    expect(order.status).toBe("pending");
    expect(order.source).toBe("wishlist");
    expect(order.totalAmount).toBe(0);
    expect(order.items).toEqual([
      { productId: undefined, productName: "Unga", quantity: 1, unitPrice: 3500, subtotal: 0 },
    ]);
  });

  it("tolerates a null payload", () => {
    const order = fromApiStorefrontOrder(null);

    expect(order.id).toBe("");
    expect(order.items).toEqual([]);
  });
});

describe("placeWishlistOrder", () => {
  const INPUT = {
    orderId: "ORD-123456",
    customerName: "Asha Juma",
    customerPhone: "0712000000",
    customerAddress: "Sinza, Dar es Salaam",
    notes: "Deliver in the morning",
    paymentMethod: "Cash / WhatsApp",
    customerType: "retail",
    items: [{ productId: "prod-1", productName: "Soda Crate", quantity: 2, price: 12000 }],
  };

  it("posts to the public shop orders endpoint keeping the session token", async () => {
    clientMock.post.mockResolvedValueOnce({
      id: "uuid-order",
      orderId: "ORD-123456",
      shopId: "shop-1",
      status: "pending",
      source: "wishlist",
      subtotal: "24000.00",
      totalAmount: "24000.00",
      items: [
        { productId: "prod-1", productName: "Soda Crate", quantity: 2, unitPrice: "12000.00", subtotal: "24000.00" },
      ],
    });

    const order = await placeWishlistOrder("mama shop/1", INPUT);

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/v1/public/shops/mama%20shop%2F1/orders/",
      INPUT
    );
    expect(order.orderId).toBe("ORD-123456");
    expect(order.totalAmount).toBe(24000);
    expect(order.items[0]).toEqual({
      productId: "prod-1",
      productName: "Soda Crate",
      quantity: 2,
      unitPrice: 12000,
      subtotal: 24000,
    });
  });

  it("propagates a rejected order", async () => {
    clientMock.post.mockRejectedValueOnce(
      new ApiError("This shop is not accepting orders.", { status: 404 })
    );

    await expect(placeWishlistOrder("no-such-shop", INPUT)).rejects.toThrow(
      "This shop is not accepting orders."
    );
  });
});
