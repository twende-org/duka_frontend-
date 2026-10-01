import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCorporateDepartment,
  approvePurchaseOrder,
  createPurchaseOrder,
  fromApiCorporateBuyer,
  fromApiCorporateDepartment,
  fromApiCorporatePurchaseOrder,
  getCorporateBuyers,
  getCorporateDepartments,
  getPurchaseOrders,
  rejectPurchaseOrder,
} from "@/lib/api/domains/corporate";

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

describe("fromApiCorporateDepartment", () => {
  it("coerces the decimal strings the DRF serializer answers with", () => {
    const dept = fromApiCorporateDepartment({
      id: "dept-1",
      companyId: "company-acme",
      name: "Procurement",
      budget: "1000000.00",
      spent: "0.00",
      createdAt: "2026-09-30T06:00:00Z",
    });

    expect(dept.budget).toBe(1000000);
    expect(dept.spent).toBe(0);
    expect(dept.companyId).toBe("company-acme");
    expect(dept.createdAt).toBe("2026-09-30T06:00:00Z");
  });

  it("tolerates a null payload", () => {
    const dept = fromApiCorporateDepartment(null);

    expect(dept.id).toBe("");
    expect(dept.name).toBe("");
    expect(dept.budget).toBe(0);
    expect(dept.spent).toBe(0);
  });
});

describe("fromApiCorporateBuyer", () => {
  it("normalizes the embedded corporate profile", () => {
    const buyer = fromApiCorporateBuyer({
      id: "user-1",
      email: "buyer@acme.co.tz",
      display_name: "Asha Mwinyi",
      phone: "+255712000000",
      corporateProfile: {
        companyId: "company-acme",
        companyName: "Acme Ltd",
        role: "buyer",
        creditLimit: "5000000.00",
        creditBalance: 120000,
        status: "APPROVED",
      },
    });

    expect(buyer.displayName).toBe("Asha Mwinyi");
    expect(buyer.corporateProfile?.creditLimit).toBe(5000000);
    expect(buyer.corporateProfile?.creditBalance).toBe(120000);
    expect(buyer.corporateProfile?.role).toBe("buyer");
  });

  it("leaves the profile absent when the user has none", () => {
    const buyer = fromApiCorporateBuyer({ id: "user-2", email: "plain@test.com" });

    expect(buyer.corporateProfile).toBeUndefined();
    expect(buyer.displayName).toBe("");
    expect(buyer.phone).toBeUndefined();
  });
});

describe("fromApiCorporatePurchaseOrder", () => {
  it("maps the line items and coerces money", () => {
    const po = fromApiCorporatePurchaseOrder({
      id: "po-1",
      shopId: "shop-1",
      shopName: "Mama Shop",
      items: [
        { productId: "p1", productName: "Sugar 1kg", quantity: 10, price: "2500.00", subtotal: "25000.00" },
      ],
      totalAmount: "25000.00",
      approvalStatus: "pending_approval",
    });

    expect(po.totalAmount).toBe(25000);
    expect(po.items[0].price).toBe(2500);
    expect(po.items[0].subtotal).toBe(25000);
    expect(po.approvalStatus).toBe("pending_approval");
  });

  it("defaults the approval status and empty items", () => {
    const po = fromApiCorporatePurchaseOrder({ id: "po-2", totalAmount: 0 });

    expect(po.approvalStatus).toBe("pending_approval");
    expect(po.items).toEqual([]);
  });
});

describe("getCorporateDepartments", () => {
  it("walks the page links", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/corporate/departments/?page=2&page_size=200",
        results: [{ id: "dept-1", name: "Procurement", budget: "1000.00" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "dept-2", name: "Stores" }] });

    const depts = await getCorporateDepartments();

    expect(depts.map((d) => d.id)).toEqual(["dept-1", "dept-2"]);
    expect(depts[0].budget).toBe(1000);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/corporate/departments/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/corporate/departments/?page=2&page_size=200",
      undefined
    );
  });
});

describe("addCorporateDepartment", () => {
  it("posts the name and budget and normalizes the server row", async () => {
    clientMock.post.mockResolvedValueOnce({
      id: "dept-3",
      name: "Marketing",
      budget: "500000.00",
      spent: "0.00",
    });

    const dept = await addCorporateDepartment({ name: "Marketing", budget: 500000 });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/corporate/departments/", {
      name: "Marketing",
      budget: 500000,
    });
    expect(dept.id).toBe("dept-3");
    expect(dept.spent).toBe(0);
  });
});

describe("getCorporateBuyers", () => {
  it("reads the company buyer directory", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "user-1" }] });

    const buyers = await getCorporateBuyers();

    expect(buyers[0].id).toBe("user-1");
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/corporate/buyers/", {
      query: { page_size: 200 },
    });
  });
});

describe("getPurchaseOrders", () => {
  it("reads the company purchase orders", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "po-1" }] });

    const orders = await getPurchaseOrders();

    expect(orders[0].id).toBe("po-1");
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/corporate/purchase-orders/", {
      query: { page_size: 200 },
    });
  });
});

describe("createPurchaseOrder", () => {
  it("posts the payload untouched; the server stamps company and status", async () => {
    clientMock.post.mockResolvedValueOnce({
      id: "po-9",
      companyId: "company-acme",
      approvalStatus: "pending_approval",
      totalAmount: "25000.00",
    });

    const po = await createPurchaseOrder({
      shopId: "shop-1",
      shopName: "Mama Shop",
      items: [{ productId: "p1", productName: "Sugar", quantity: 10, price: 2500, subtotal: 25000 }],
      totalAmount: 25000,
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/corporate/purchase-orders/", {
      shopId: "shop-1",
      shopName: "Mama Shop",
      items: [{ productId: "p1", productName: "Sugar", quantity: 10, price: 2500, subtotal: 25000 }],
      totalAmount: 25000,
    });
    expect(po.companyId).toBe("company-acme");
    expect(po.totalAmount).toBe(25000);
  });
});

describe("approvePurchaseOrder", () => {
  it("posts the approver id to the encoded action URL", async () => {
    clientMock.post.mockResolvedValueOnce({
      id: "po-1",
      approvalStatus: "APPROVED",
      approverId: "user-9",
    });

    const po = await approvePurchaseOrder("po 1/legacy", "user-9");

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/v1/corporate/purchase-orders/po%201%2Flegacy/approve/",
      { approverId: "user-9" }
    );
    expect(po.approvalStatus).toBe("APPROVED");
  });

  it("sends an empty body when no approver id is given", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "po-1", approvalStatus: "APPROVED" });

    await approvePurchaseOrder("po-1");

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/v1/corporate/purchase-orders/po-1/approve/",
      {}
    );
  });
});

describe("rejectPurchaseOrder", () => {
  it("posts an empty body to the encoded action URL", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "po-1", approvalStatus: "REJECTED" });

    const po = await rejectPurchaseOrder("po 1");

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/v1/corporate/purchase-orders/po%201/reject/",
      {}
    );
    expect(po.approvalStatus).toBe("REJECTED");
  });
});
