import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countOpenSupportTickets,
  fetchSupportTickets,
  fromApiSupportTicket,
  setSupportTicketResolved,
  submitSupportTicket,
} from "@/lib/api/domains/support";

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

describe("fromApiSupportTicket", () => {
  it("normalizes a DRF row", () => {
    const ticket = fromApiSupportTicket({
      id: "t-1",
      userId: "user-1",
      userEmail: "mama@test.com",
      userName: "Mama Asha",
      shopId: "shop-1",
      message: "Ripoti haifanyi kazi",
      category: "Bug",
      route: "/app/reports",
      resolved: true,
      createdAt: "2026-09-29T09:00:00Z",
    });

    expect(ticket.id).toBe("t-1");
    expect(ticket.userName).toBe("Mama Asha");
    expect(ticket.route).toBe("/app/reports");
    expect(ticket.resolved).toBe(true);
    expect(ticket.createdAt).toBe("2026-09-29T09:00:00Z");
  });

  it("defaults a missing category to Bug and empty optionals to undefined", () => {
    const ticket = fromApiSupportTicket({ id: "t-2", message: "Hi" });

    expect(ticket.category).toBe("Bug");
    expect(ticket.resolved).toBe(false);
    expect(ticket.userEmail).toBeUndefined();
    expect(ticket.shopId).toBeUndefined();
    expect(ticket.route).toBeUndefined();
  });
});

describe("reads", () => {
  it("walks DRF page links for the admin queue", async () => {
    clientMock.get
      .mockResolvedValueOnce({ next: "http://testserver/api/v1/support-tickets/?page=2", results: [{ id: "t1" }] })
      .mockResolvedValueOnce({ next: null, results: [{ id: "t2" }] });

    const tickets = await fetchSupportTickets();

    expect(tickets.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/support-tickets/", {
      query: { page_size: 200 },
    });
  });

  it("reads the open-ticket badge from DRF's count", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 3, results: [{ id: "t1" }] });

    await expect(countOpenSupportTickets()).resolves.toBe(3);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/support-tickets/", {
      query: { resolved: "false", page_size: 1 },
    });
  });

  it("falls back to zero when the count is missing", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await expect(countOpenSupportTickets()).resolves.toBe(0);
  });
});

describe("writes", () => {
  it("submits only the message and context; identity stays server-side", async () => {
    clientMock.post.mockResolvedValue({ id: "t-9", message: "Msaada", category: "Bug", resolved: false });

    const created = await submitSupportTicket({
      message: "Msaada",
      category: "Bug",
      shopId: "shop-1",
      route: "/app/dashboard",
    });

    expect(created.id).toBe("t-9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/support-tickets/", {
      message: "Msaada",
      category: "Bug",
      shopId: "shop-1",
      route: "/app/dashboard",
    });
  });

  it("sends empty strings when the ticket has no shop or route", async () => {
    clientMock.post.mockResolvedValue({ id: "t-10" });

    await submitSupportTicket({ message: "Msaada", category: "Other" });

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/support-tickets/", {
      message: "Msaada",
      category: "Other",
      shopId: "",
      route: "",
    });
  });

  it("flips resolved by the app-visible id", async () => {
    clientMock.patch.mockResolvedValue({ id: "t-1", resolved: true });

    await setSupportTicketResolved("t-1", true);

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/support-tickets/t-1/", { resolved: true });
  });
});
