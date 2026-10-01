import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCustomer,
  deleteCustomer,
  fromApiCustomer,
  fromApiCustomerBalance,
  fromApiCustomerInvoice,
  fromApiCustomerPayment,
  getCustomerBalances,
  getCustomers,
  processCustomerPayment,
  updateCustomer,
} from "@/lib/api/domains/customers";

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

describe("fromApiCustomer", () => {
  it("keeps the legacy id visible so sales and orders still resolve it", () => {
    const customer = fromApiCustomer({
      id: "5f0c1e4a-0000-4000-8000-000000000001",
      legacyId: "custLegacy01",
      shopId: "shopLegacy01",
      name: "Mama Asha",
      customerType: "wholesale",
      phone: "+255700000001",
      totalSpent: "120000.00",
      outstandingBalance: "20000.00",
      lastPurchaseDate: "2026-09-20",
      createdAt: "2026-09-01T08:00:00Z",
      updatedAt: null,
      userId: "userLegacy01",
    });

    expect(customer.id).toBe("custLegacy01");
    expect(customer.shopId).toBe("shopLegacy01");
    expect(customer.customerType).toBe("wholesale");
    expect(customer.totalSpent).toBe(120000);
    expect(customer.outstandingBalance).toBe(20000);
    // The serializer always sends a timestamp; a null updatedAt falls back.
    expect(customer.updatedAt).toBe("2026-09-01T08:00:00Z");
    expect(customer.userId).toBe("userLegacy01");
  });

  it("falls back to the Django uuid when the row was not imported from the legacy backend", () => {
    const customer = fromApiCustomer({ id: "uuid-cust-2", shopId: "shopLegacy01", name: "Juma" });

    expect(customer.id).toBe("uuid-cust-2");
    expect(customer.customerType).toBeUndefined();
    expect(customer.email).toBeUndefined();
  });

  it("maps an empty commercialSettings dict back to 'not configured'", () => {
    const customer = fromApiCustomer({ id: "c1", shopId: "s1", name: "x", commercialSettings: {} });

    expect(customer.commercialSettings).toBeUndefined();
  });

  it("fills the limit from the column when the wizard's JSON lacks it", () => {
    const customer = fromApiCustomer({
      id: "c1",
      shopId: "s1",
      name: "x",
      creditLimit: "150000.00",
      commercialSettings: { creditEnabled: true },
    });

    expect(customer.commercialSettings).toEqual({ creditEnabled: true, creditLimit: 150000 });
  });

  it("keeps the JSON's own limit when both stores disagree", () => {
    const customer = fromApiCustomer({
      id: "c1",
      shopId: "s1",
      name: "x",
      creditLimit: "150000.00",
      commercialSettings: { creditEnabled: true, creditLimit: 120000 },
    });

    expect(customer.commercialSettings?.creditLimit).toBe(120000);
  });
});

describe("fromApiCustomerInvoice", () => {
  it("derives the presentation fields Django does not store", () => {
    const invoice = fromApiCustomerInvoice({
      id: "a1b2c3d4-1111-2222-3333-444455556666",
      shopId: "shopLegacy01",
      customerId: { legacyId: "custLegacy01" },
      orderId: null,
      amountDue: "30000.00",
      amountPaid: "10000.00",
      dueDate: "2026-10-15",
      status: "overdue",
      createdAt: "2026-09-29T08:00:00Z",
    });

    expect(invoice.invoiceNumber).toBe("INV-A1B2C3D4");
    expect(invoice.customerId).toBe("custLegacy01");
    expect(invoice.orderId).toBe("");
    expect(invoice.currency).toBe("TZS");
    expect(invoice.subtotal).toBe(30000);
    expect(invoice.taxAmount).toBe(0);
    expect(invoice.discountAmount).toBe(0);
    expect(invoice.totalAmount).toBe(30000);
    expect(invoice.status).toBe("overdue");
  });

  it("defaults an unknown status to pending", () => {
    expect(fromApiCustomerInvoice({ id: "inv-1", status: "weird" }).status).toBe("pending");
  });
});

describe("fromApiCustomerPayment", () => {
  it("resolves allocated invoice ids and falls back to the payment date", () => {
    const payment = fromApiCustomerPayment({
      id: "pay-1",
      shopId: "shopLegacy01",
      customerId: "custLegacy01",
      amount: "5000.00",
      method: "Mobile Money",
      reference: "REF123",
      invoiceIds: [{ legacyId: "invLegacy01" }, "2f0c1e4a-0000-4000-8000-000000000002"],
      date: "2026-09-29",
      createdAt: null,
    });

    expect(payment.amount).toBe(5000);
    expect(payment.method).toBe("Mobile Money");
    expect(payment.invoiceIds).toEqual([
      "invLegacy01",
      "2f0c1e4a-0000-4000-8000-000000000002",
    ]);
    expect(payment.createdAt).toBe("2026-09-29");
  });

  it("drops an empty allocation list and coerces an unknown method to Cash", () => {
    const payment = fromApiCustomerPayment({ id: "pay-2", method: "Bitcoin", invoiceIds: [] });

    expect(payment.invoiceIds).toBeUndefined();
    expect(payment.method).toBe("Cash");
  });
});

describe("fromApiCustomerBalance", () => {
  it("reconstructs purchases as outstanding plus the payments collected", () => {
    const balance = fromApiCustomerBalance(
      { id: "custLegacy01", shopId: "shopLegacy01", name: "Mama Asha", outstandingBalance: 20000 },
      5000
    );

    expect(balance).toEqual({
      id: "shopLegacy01_custLegacy01",
      shopId: "shopLegacy01",
      customerId: "custLegacy01",
      totalPurchases: 25000,
      outstandingBalance: 20000,
      paidAmount: 5000,
      updatedAt: undefined,
    });
  });
});

describe("getCustomers", () => {
  it("walks DRF's page links to keep the returned-everything contract", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://127.0.0.1:8009/api/v1/customers/?page=2&page_size=200",
        results: [{ legacyId: "cust1", shopId: "shop1", name: "A" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ legacyId: "cust2", shopId: "shop1", name: "B" }] });

    const customers = await getCustomers("shop1");

    expect(customers.map((row) => row.id)).toEqual(["cust1", "cust2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/customers/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/customers/?page=2&page_size=200", undefined);
  });
});

describe("getCustomerBalances", () => {
  it("sums payments per customer and hides customers with no credit activity", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        results: [
          { legacyId: "c1", shopId: "s1", name: "Zero", outstandingBalance: "0.00" },
          { legacyId: "c2", shopId: "s1", name: "Owes", outstandingBalance: "12000.00" },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          { customerId: "c2", amount: "2000.00" },
          { customerId: "c2", amount: 1000 },
          { customerId: "ghost", amount: "500.00" },
        ],
      });

    const balances = await getCustomerBalances("s1");

    expect(balances).toEqual([
      {
        id: "s1_c2",
        shopId: "s1",
        customerId: "c2",
        totalPurchases: 15000,
        outstandingBalance: 12000,
        paidAmount: 3000,
        updatedAt: undefined,
      },
    ]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/customers/", {
      query: { shop_id: "s1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/customer-payments/", {
      query: { shop_id: "s1", page_size: 200 },
    });
  });
});

describe("addCustomer", () => {
  it("sends the wizard fields in the backend's aliases, limit included twice", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "uuid-new", legacyId: "newLegacy" });

    const id = await addCustomer({
      name: "Juma",
      shopId: "shopLegacy01",
      phone: "",
      email: "",
      commercialSettings: {
        priceTier: "wholesale",
        creditEnabled: true,
        creditLimit: 50000,
        paymentTerms: "30 Days",
      },
    });

    expect(id).toBe("newLegacy");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/customers/", {
      name: "Juma",
      shopId: "shopLegacy01",
      phone: "",
      email: "",
      commercialSettings: {
        priceTier: "wholesale",
        creditEnabled: true,
        creditLimit: 50000,
        paymentTerms: "30 Days",
      },
      // The backend's credit checks read the column, not the JSON.
      creditLimit: 50000,
    });
  });
});

describe("updateCustomer", () => {
  it("patches only the fields the wizard sent, by the app-visible id", async () => {
    clientMock.patch.mockResolvedValueOnce({});

    await updateCustomer("custLegacy01", { name: "Renamed", shopId: "shopLegacy01" });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/customers/custLegacy01/", {
      name: "Renamed",
      shopId: "shopLegacy01",
    });
  });
});

describe("deleteCustomer", () => {
  it("deletes by the app-visible id", async () => {
    clientMock.del.mockResolvedValueOnce(null);

    await deleteCustomer("custLegacy01");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/customers/custLegacy01/");
  });
});

describe("processCustomerPayment", () => {
  it("posts to the record_payment action without the legacy-only date", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "pay-1" });

    const id = await processCustomerPayment("shopLegacy01", "custLegacy01", {
      amount: 5000,
      method: "Cash",
      reference: "",
      notes: "",
      date: "2026-09-29",
    });

    expect(id).toBe("pay-1");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/customers/custLegacy01/record_payment/", {
      amount: 5000,
      method: "Cash",
      reference: "",
      notes: "",
    });
  });

  it("forwards invoice allocations when the caller picked any", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "pay-2" });

    await processCustomerPayment("shopLegacy01", "custLegacy01", {
      amount: 1000,
      method: "Bank",
      reference: "R-1",
      notes: "part payment",
      date: "2026-09-29",
      invoiceIds: ["invLegacy01"],
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/customers/custLegacy01/record_payment/", {
      amount: 1000,
      method: "Bank",
      reference: "R-1",
      notes: "part payment",
      invoiceIds: ["invLegacy01"],
    });
  });
});
