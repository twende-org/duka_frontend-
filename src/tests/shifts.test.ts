import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeShift, fromApiShift, getCurrentOpenShift, openShift } from "@/lib/api/domains/shifts";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("fromApiShift", () => {
  it("maps the drawer fields the register reads", () => {
    const shift = fromApiShift({
      id: "uuid-shift-1",
      legacyId: "shiftLegacy01",
      shopId: { legacyId: "shop1" },
      status: "CLOSED",
      openedBy: { legacyId: "user1" },
      openedByName: "Asha",
      openedAt: "2026-09-29T07:00:00Z",
      openingCash: "20000.00",
      closedBy: "user2uuid",
      closedByName: "Juma",
      closedAt: "2026-09-29T19:00:00Z",
      cashSalesTotal: "9000.00",
      cashExpensesTotal: "500.00",
      expectedClosingCash: "28500.00",
      actualClosingCash: "28500.00",
      cashLeftForNextDay: "5000.00",
      cashSubmittedToOwner: "23500.00",
      discrepancy: "0.00",
      notes: "Siku nzuri",
      ownerApprovalStatus: "PENDING",
    });

    expect(shift.id).toBe("shiftLegacy01");
    expect(shift.shopId).toBe("shop1");
    expect(shift.status).toBe("CLOSED");
    expect(shift.openedBy).toBe("user1");
    expect(shift.openingCash).toBe(20000);
    expect(shift.expectedClosingCash).toBe(28500);
    expect(shift.actualClosingCash).toBe(28500);
    expect(shift.cashSubmittedToOwner).toBe(23500);
    expect(shift.closedAt).toBe("2026-09-29T19:00:00Z");
  });

  it("defaults an open drawer and falls back to createdAt", () => {
    const shift = fromApiShift({ id: "shift-2", status: "OPEN", createdAt: "2026-09-29T07:00:00Z" });

    expect(shift.status).toBe("OPEN");
    expect(shift.openedAt).toBe("2026-09-29T07:00:00Z");
    expect(shift.openingCash).toBe(0);
    expect(shift.actualClosingCash).toBeUndefined();
    expect(shift.discrepancy).toBeUndefined();
  });
});

describe("getCurrentOpenShift", () => {
  it("returns the newest open drawer or null", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 1, results: [{ id: "shift-1", status: "OPEN" }] });

    const open = await getCurrentOpenShift("shop1", "branch1");

    expect(open?.id).toBe("shift-1");
    expect(clientMock.get).toHaveBeenLastCalledWith("/api/v1/shifts/", {
      query: { shop_id: "shop1", status: "OPEN", page_size: 1, branch_id: "branch1" },
    });

    clientMock.get.mockResolvedValueOnce({ count: 0, results: [] });
    await expect(getCurrentOpenShift("shop1")).resolves.toBeNull();
  });
});

describe("openShift", () => {
  it("posts the drawer payload without client-owned status or identity", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "shift-9", status: "OPEN", openingCash: "10000.00" });

    const shift = await openShift({
      shopId: "shop1",
      openedBy: "user1",
      openedByName: "Asha",
      openedAt: "2026-09-29T07:00:00.000Z",
      openingCash: 10000,
      status: "OPEN",
    });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/shifts/", {
      shopId: "shop1",
      openingCash: 10000,
      openedByName: "Asha",
      openedAt: "2026-09-29T07:00:00.000Z",
    });
    expect(shift.id).toBe("shift-9");
    expect(shift.openingCash).toBe(10000);
  });
});

describe("closeShift", () => {
  it("posts the count-up and lets the server own the closer identity", async () => {
    clientMock.post.mockResolvedValueOnce({});

    await closeShift("shop1", "shiftLegacy01", {
      closedBy: "user1",
      closedByName: "Asha",
      actualClosingCash: 28500,
      cashLeftForNextDay: 5000,
      cashSubmittedToOwner: 23500,
    });

    expect(clientMock.post).toHaveBeenLastCalledWith("/api/v1/shifts/shiftLegacy01/close/", {
      actualClosingCash: 28500,
      cashLeftForNextDay: 5000,
      cashSubmittedToOwner: 23500,
      closedByName: "Asha",
    });
  });
});
