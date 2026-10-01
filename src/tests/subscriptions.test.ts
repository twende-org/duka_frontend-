import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmSubscriptionOnApi,
  fetchSubscription,
  fromApiSubscription,
  listSubscriptions,
  saveSubscription,
} from "@/lib/api/domains/subscriptions";

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

describe("fromApiSubscription", () => {
  it("normalizes a full row and coerces the amount", () => {
    const row = fromApiSubscription({
      id: "sub-1",
      userId: "user-1",
      userEmail: "mama@test.com",
      userName: "Mama Asha",
      plan: "premium",
      status: "active",
      startDate: "2026-09-01T00:00:00Z",
      endDate: "2026-10-01T00:00:00Z",
      paymentMethod: "M-Pesa",
      paymentReference: "REF-1",
      amount: "25000.00",
      confirmedBy: "admin-1",
      confirmedAt: "2026-09-01T08:00:00Z",
      createdAt: "2026-09-01T07:00:00Z",
      updatedAt: "2026-09-01T08:00:00Z",
    });

    expect(row.userId).toBe("user-1");
    expect(row.plan).toBe("premium");
    expect(row.amount).toBe(25000);
    expect(row.paymentReference).toBe("REF-1");
    expect(row.confirmedBy).toBe("admin-1");
  });

  it("defaults the plan to free and the status to pending", () => {
    const row = fromApiSubscription({ user_id: "user-2" });

    expect(row.id).toBe("user-2");
    expect(row.userId).toBe("user-2");
    expect(row.plan).toBe("free");
    expect(row.status).toBe("pending");
    expect(row.amount).toBe(0);
    expect(row.startDate).toBe("");
    expect(row.paymentMethod).toBeUndefined();
  });

  it("leaves an unparsable amount at zero", () => {
    expect(fromApiSubscription({ amount: "not-a-number" }).amount).toBe(0);
    expect(fromApiSubscription({ amount: null }).amount).toBe(0);
  });

  it("tolerates a null payload", () => {
    expect(fromApiSubscription(null).plan).toBe("free");
  });
});

describe("fetchSubscription", () => {
  it("reads by the encoded user id", async () => {
    clientMock.get.mockResolvedValueOnce({ userId: "user-1", plan: "premium" });

    const row = await fetchSubscription("user 1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/subscriptions/user%201/");
    expect(row?.plan).toBe("premium");
  });

  it("returns null for the free tier (server answers a bare null)", async () => {
    clientMock.get.mockResolvedValueOnce(null);

    await expect(fetchSubscription("user-2")).resolves.toBeNull();
  });

  it("propagates failures callers may render", async () => {
    clientMock.get.mockRejectedValueOnce(new Error("Network request failed"));

    await expect(fetchSubscription("user-3")).rejects.toThrow("Network request failed");
  });
});

describe("saveSubscription", () => {
  it("upserts with PUT (the legacy setDoc) and normalizes the answer", async () => {
    clientMock.put.mockResolvedValueOnce({ userId: "user-1", plan: "premium", amount: 25000 });

    const row = await saveSubscription("user-1", { plan: "premium", amount: 25000 });

    expect(clientMock.put).toHaveBeenCalledWith("/api/v1/subscriptions/user-1/", {
      plan: "premium",
      amount: 25000,
    });
    expect(row.plan).toBe("premium");
    expect(clientMock.patch).not.toHaveBeenCalled();
  });

  it("merges with PATCH when partial", async () => {
    clientMock.patch.mockResolvedValueOnce({ userId: "user-1", status: "active" });

    await saveSubscription("user-1", { status: "active" }, true);

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/subscriptions/user-1/", {
      status: "active",
    });
    expect(clientMock.put).not.toHaveBeenCalled();
  });
});

describe("confirmSubscriptionOnApi", () => {
  it("posts the staff activation and normalizes the row", async () => {
    clientMock.post.mockResolvedValueOnce({
      userId: "user-1",
      status: "active",
      confirmedBy: "admin-1",
      confirmed_at: "2026-09-30T06:00:00Z",
    });

    const row = await confirmSubscriptionOnApi("user 1");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/subscriptions/user%201/confirm/");
    expect(row.status).toBe("active");
    expect(row.confirmedBy).toBe("admin-1");
    expect(row.confirmedAt).toBe("2026-09-30T06:00:00Z");
  });
});

describe("listSubscriptions", () => {
  it("walks the page links for the admin directory", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/subscriptions/?page=2&page_size=200",
        results: [{ userId: "u1", plan: "premium" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ user_id: "u2" }] });

    const rows = await listSubscriptions();

    expect(rows.map((r) => r.userId)).toEqual(["u1", "u2"]);
    expect(rows[1].plan).toBe("free");
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/subscriptions/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/subscriptions/?page=2&page_size=200",
      undefined
    );
  });
});
