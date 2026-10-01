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
  fromApiSupplier,
  getSuppliers,
  getSuppliersPaginated,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/api/domains/suppliers";

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiSupplier", () => {
  it("prefers legacyId and coerces nullable columns to empty strings", () => {
    const supplier = fromApiSupplier({
      legacyId: "supLegacy01",
      id: "8f3b1c22-0000-4444-8888-abcdefabcdef",
      shopId: { legacyId: "shopLegacy01", id: "shopDbUuid" },
      name: "Mama Lishe Supplies",
      phone: "0712000111",
      email: null,
      address: null,
      products: null,
      notes: null,
      ownerId: null,
      platformShopId: null,
    });

    expect(supplier).toEqual({
      id: "supLegacy01",
      shopId: "shopLegacy01",
      name: "Mama Lishe Supplies",
      phone: "0712000111",
      email: undefined,
      address: undefined,
      products: "",
      notes: "",
      ownerId: "",
      platformShopId: undefined,
    });
  });

  it("falls back to the Django uuid and keeps optional strings when present", () => {
    const supplier = fromApiSupplier({
      id: "supDbUuid",
      shopId: "shopDbUuid",
      name: "Kariakoo Wholesalers",
      phone: "",
      email: "orders@kariakoo.test",
      address: "Msimbazi St",
      products: "Sugar, Rice",
      notes: "Delivers on Mondays",
      ownerId: "ownerUuid",
      platformShopId: "platformShop01",
    });

    expect(supplier.id).toBe("supDbUuid");
    expect(supplier.shopId).toBe("shopDbUuid");
    expect(supplier.email).toBe("orders@kariakoo.test");
    expect(supplier.address).toBe("Msimbazi St");
    expect(supplier.products).toBe("Sugar, Rice");
    expect(supplier.notes).toBe("Delivers on Mondays");
    expect(supplier.ownerId).toBe("ownerUuid");
    expect(supplier.platformShopId).toBe("platformShop01");
  });

  it("returns safe defaults for an empty row", () => {
    const supplier = fromApiSupplier({});

    expect(supplier).toEqual({
      id: "",
      shopId: "",
      name: "",
      phone: "",
      email: undefined,
      address: undefined,
      products: "",
      notes: "",
      ownerId: "",
      platformShopId: undefined,
    });
  });
});

describe("getSuppliers", () => {
  it("walks pagination and maps every row", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        results: [
          { id: "s1", shopId: "shop1", name: "One", phone: "0700" },
          { id: "s2", shopId: "shop1", name: "Two", phone: "0701" },
        ],
      });

    const rows = await getSuppliers("shop1");

    expect(clientMock.get).toHaveBeenCalledTimes(1);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/suppliers/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(rows.map((row) => row.name)).toEqual(["One", "Two"]);
    expect(rows[1].id).toBe("s2");
  });
});

describe("getSuppliersPaginated", () => {
  it("returns the relative next path as the cursor on the first page", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 3,
      next: "http://localhost:8009/api/v1/suppliers/?page=2&page_size=20",
      results: [{ id: "s1", shopId: "shop1", name: "One" }],
    });

    const page = await getSuppliersPaginated("shop1", 20, null);

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/suppliers/", {
      query: { shop_id: "shop1", page_size: 20 },
    });
    expect(page.hasMore).toBe(true);
    expect(page.lastDoc).toBe("/api/v1/suppliers/?page=2&page_size=20");
    expect(page.data).toHaveLength(1);
  });

  it("follows the stored cursor path with no extra query", async () => {
    clientMock.get.mockResolvedValueOnce({
      count: 3,
      next: null,
      results: [{ id: "s2", shopId: "shop1", name: "Two" }],
    });

    const page = await getSuppliersPaginated(
      "shop1",
      20,
      "/api/v1/suppliers/?page=2&page_size=20",
    );

    expect(clientMock.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/suppliers/?page=2&page_size=20",
    );
    expect(page.hasMore).toBe(false);
    expect(page.lastDoc).toBeNull();
    expect(page.data[0].name).toBe("Two");
  });
});

describe("addSupplier", () => {
  it("posts only defined keys and returns the created id", async () => {
    clientMock.post.mockResolvedValueOnce({
      id: "supNew",
      legacyId: "supLegacyNew",
      shopId: "shop1",
      name: "New Supplier",
      phone: "0700555111",
    });

    const id = await addSupplier({
      shopId: "shop1",
      name: "New Supplier",
      phone: "0700555111",
      email: undefined,
      address: undefined,
      products: "",
      notes: "",
      ownerId: "",
      platformShopId: undefined,
    });

    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/suppliers/", {
      shopId: "shop1",
      name: "New Supplier",
      phone: "0700555111",
      products: "",
      notes: "",
      ownerId: "",
    });
    expect(id).toBe("supLegacyNew");
  });
});

describe("updateSupplier", () => {
  it("patches the url-encoded id", async () => {
    clientMock.patch.mockResolvedValueOnce({});

    await updateSupplier("sup/Weird Id", { phone: "0700999888" });

    expect(clientMock.patch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/suppliers/sup%2FWeird%20Id/",
      { phone: "0700999888" },
    );
  });
});

describe("deleteSupplier", () => {
  it("deletes the url-encoded id", async () => {
    clientMock.del.mockResolvedValueOnce(undefined);

    await deleteSupplier("supLegacy01");

    expect(clientMock.del).toHaveBeenNthCalledWith(
      1,
      "/api/v1/suppliers/supLegacy01/",
    );
  });
});
