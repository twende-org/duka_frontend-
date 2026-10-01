import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addExpenseWithSummary,
  deleteExpense,
  fromApiExpense,
  getExpenses,
  getExpensesPaginated,
  updateExpense,
} from "@/lib/api/domains/expenses";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiExpense", () => {
  it("keeps the fields the table and edit dialog read", () => {
    const expense = fromApiExpense({
      id: "uuid-exp-1",
      legacyId: "expLegacy01",
      shopId: { legacyId: "shop1" },
      branchId: "branchLegacy01",
      category: "Kodi",
      description: "Kodi ya pango",
      amount: "50000.00",
      date: "2026-09-29",
      paymentMethod: "Taslimu",
      reference: "RCPT-1",
      notes: "Mwezi wa tisa",
      shiftId: "shiftLegacy01",
      paidTo: "Mwenye nyumba",
      isRecurring: true,
    });

    expect(expense).toEqual({
      id: "expLegacy01",
      shopId: "shop1",
      branchId: "branchLegacy01",
      category: "Kodi",
      description: "Kodi ya pango",
      amount: 50000,
      date: "2026-09-29",
      paymentMethod: "Taslimu",
      reference: "RCPT-1",
      notes: "Mwezi wa tisa",
      shiftId: "shiftLegacy01",
      paidTo: "Mwenye nyumba",
      isRecurring: true,
    });
  });

  it("drops blanks and non-recurring flags", () => {
    const expense = fromApiExpense({ id: "exp-2", shopId: "shop1", description: "Umeme", isRecurring: false });

    expect(expense.id).toBe("exp-2");
    expect(expense.branchId).toBeUndefined();
    expect(expense.shiftId).toBeUndefined();
    expect(expense.paidTo).toBeUndefined();
    expect(expense.isRecurring).toBeUndefined();
    expect(expense.amount).toBe(0);
  });
});

describe("getExpenses", () => {
  it("returns the whole shop ledger, walking page links", async () => {
    clientMock.get
      .mockResolvedValueOnce({ next: "/api/v1/expenses/?page=2", results: [{ id: "e1" }] })
      .mockResolvedValueOnce({ next: null, results: [{ id: "e2" }] });

    const rows = await getExpenses("shop1");

    expect(rows.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/expenses/", {
      query: { shop_id: "shop1", page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/expenses/?page=2", undefined);
  });
});

describe("getExpensesPaginated", () => {
  it("maps DRF pages onto the legacy cursor contract", async () => {
    clientMock.get.mockResolvedValueOnce({ next: "/next", results: [{ id: "e1" }] });

    const first = await getExpensesPaginated("shop1", 20, null, "branch1");

    expect(first.data.map((e) => e.id)).toEqual(["e1"]);
    expect(first.lastDoc).toBe(1);
    expect(first.hasMore).toBe(true);
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/expenses/", {
      query: { shop_id: "shop1", page: 1, page_size: 20, branch_id: "branch1" },
    });

    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });
    const second = await getExpensesPaginated("shop1", 20, first.lastDoc);

    expect(second).toEqual({ data: [], lastDoc: null, hasMore: false });
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/expenses/", {
      query: { shop_id: "shop1", page: 2, page_size: 20 },
    });
  });

  it("ignores a snapshot-shaped cursor and clamps the page size", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await getExpensesPaginated("shop1", 0, { id: "legacySnapshot" });

    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/expenses/", {
      query: { shop_id: "shop1", page: 1, page_size: 20 },
    });
  });
});

describe("expense writes", () => {
  it("records through the API and returns the app-visible id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "uuid-1", legacyId: "expLegacy9" });

    const id = await addExpenseWithSummary({
      shopId: "shop1",
      category: "Umeme",
      description: "Luku",
      amount: 20000,
      date: "2026-09-29T00:00:00.000Z",
      paymentMethod: "Taslimu",
      reference: " ",
      notes: "",
      branchId: "",
    });

    expect(id).toBe("expLegacy9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/expenses/", {
      shopId: "shop1",
      category: "Umeme",
      description: "Luku",
      amount: 20000,
      date: "2026-09-29",
      paymentMethod: "Taslimu",
      reference: " ",
      notes: "",
    });
  });

  it("patches the delta and deletes by the app-visible id", async () => {
    clientMock.patch.mockResolvedValueOnce({});
    clientMock.del.mockResolvedValueOnce({});

    await updateExpense("expLegacy9", { amount: 25000, date: "2026-09-30" });
    expect(clientMock.patch).toHaveBeenLastCalledWith("/api/v1/expenses/expLegacy9/", {
      amount: 25000,
      date: "2026-09-30",
    });

    await deleteExpense("expLegacy9");
    expect(clientMock.del).toHaveBeenLastCalledWith("/api/v1/expenses/expLegacy9/");
  });
});
