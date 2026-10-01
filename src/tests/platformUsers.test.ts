import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveBusinessApplication,
  deletePlatformUser,
  fromApiPlatformUser,
  getPendingBusinessApplications,
  grantPlatformAdmin,
  listPlatformUsers,
  rejectBusinessApplication,
  updatePlatformUser,
} from "@/lib/api/domains/platformUsers";

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

afterEach(() => {
  vi.useRealTimers();
});

describe("fromApiPlatformUser", () => {
  it("normalizes a full row", () => {
    const user = fromApiPlatformUser({
      id: "user-1",
      email: "mama@test.com",
      displayName: "Mama Asha",
      phone: "+255712000000",
      accountType: "merchant",
      isStaff: true,
      isSuspended: false,
      businessProfile: { companyName: "Mama Shop Ltd", tin: "123-456", status: "PENDING" },
      createdAt: "2026-09-30T06:00:00Z",
    });

    expect(user.displayName).toBe("Mama Asha");
    expect(user.accountType).toBe("merchant");
    expect(user.isStaff).toBe(true);
    expect(user.businessProfile?.companyName).toBe("Mama Shop Ltd");
    expect(user.businessProfile?.status).toBe("PENDING");
  });

  it("reads snake_case keys and leaves absent fields undefined", () => {
    const user = fromApiPlatformUser({
      id: "user-2",
      email: "juma@test.com",
      display_name: "Juma",
      account_type: "customer",
      is_staff: false,
      is_suspended: true,
      business_profile: { companyName: "Juma Traders", status: "APPROVED" },
      created_at: "2026-09-29T09:00:00Z",
    });

    expect(user.displayName).toBe("Juma");
    expect(user.accountType).toBe("customer");
    expect(user.isSuspended).toBe(true);
    expect(user.businessProfile?.companyName).toBe("Juma Traders");
    expect(user.createdAt).toBe("2026-09-29T09:00:00Z");
  });

  it("keeps a never-applied business profile absent rather than empty", () => {
    const user = fromApiPlatformUser({ id: "user-3", business_profile: [] });

    expect(user.businessProfile).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.accountType).toBeUndefined();
    expect(user.createdAt).toBeUndefined();
    expect(user.isStaff).toBe(false);
  });

  it("tolerates a null payload", () => {
    expect(fromApiPlatformUser(null).id).toBe("");
  });
});

describe("listPlatformUsers", () => {
  it("walks the page links and normalizes the directory", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/users/?page=2&page_size=200",
        results: [{ id: "u1", email: "a@test.com" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "u2", email: "b@test.com" }] });

    const users = await listPlatformUsers();

    expect(users.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(users[1].email).toBe("b@test.com");
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/users/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/users/?page=2&page_size=200", undefined);
  });
});

describe("updatePlatformUser", () => {
  it("patches by the encoded app-visible id and normalizes the response", async () => {
    clientMock.patch.mockResolvedValueOnce({ id: "user-1", is_suspended: true });

    const user = await updatePlatformUser("user 1/legacy", { isSuspended: true });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/users/user%201%2Flegacy/", {
      isSuspended: true,
    });
    expect(user.isSuspended).toBe(true);
  });

  it("sends a business profile patch as-is", async () => {
    clientMock.patch.mockResolvedValueOnce({
      id: "user-1",
      business_profile: { status: "APPROVED" },
    });

    const user = await updatePlatformUser("user-1", { businessProfile: { status: "APPROVED" } });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/users/user-1/", {
      businessProfile: { status: "APPROVED" },
    });
    expect(user.businessProfile?.status).toBe("APPROVED");
  });
});

describe("grantPlatformAdmin", () => {
  it("grants the flag by default", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "user-1", isStaff: true });

    const user = await grantPlatformAdmin("user-1");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/users/user-1/system-admin/", {
      isSystemAdmin: true,
    });
    expect(user.isStaff).toBe(true);
  });

  it("revokes when asked explicitly", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "user-1", isStaff: false });

    await grantPlatformAdmin("user-1", false);

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/users/user-1/system-admin/", {
      isSystemAdmin: false,
    });
  });
});

describe("deletePlatformUser", () => {
  it("deletes by the encoded id", async () => {
    clientMock.del.mockResolvedValueOnce(null);

    await deletePlatformUser("user 1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/users/user%201/");
  });
});

describe("getPendingBusinessApplications", () => {
  it("asks the directory for the PENDING business-status queue", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: null,
      results: [{ id: "u1", business_profile: { status: "PENDING" } }],
    });

    const apps = await getPendingBusinessApplications();

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/users/", {
      query: { page_size: 200, business_status: "PENDING" },
    });
    expect(apps[0].businessProfile?.status).toBe("PENDING");
  });
});

describe("approveBusinessApplication", () => {
  it("merges the approval onto the business profile with the credit line", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T10:00:00Z"));
    clientMock.patch.mockResolvedValueOnce({
      id: "user-1",
      business_profile: { status: "APPROVED", creditLimit: 2000000 },
    });

    const user = await approveBusinessApplication("user-1", 2000000);

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/users/user-1/", {
      businessProfile: {
        status: "APPROVED",
        creditLimit: 2000000,
        creditBalance: 2000000,
        approvedAt: "2026-09-30T10:00:00.000Z",
      },
    });
    expect(user.businessProfile?.status).toBe("APPROVED");
  });

  it("defaults the credit line to 1,000,000", async () => {
    clientMock.patch.mockResolvedValueOnce({ id: "user-2" });

    await approveBusinessApplication("user-2");

    const [, payload] = clientMock.patch.mock.calls[0];
    expect(payload.businessProfile.creditLimit).toBe(1000000);
    expect(payload.businessProfile.creditBalance).toBe(1000000);
  });
});

describe("rejectBusinessApplication", () => {
  it("only patches the status", async () => {
    clientMock.patch.mockResolvedValueOnce({
      id: "user-3",
      business_profile: { status: "REJECTED" },
    });

    const user = await rejectBusinessApplication("user-3");

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/users/user-3/", {
      businessProfile: { status: "REJECTED" },
    });
    expect(user.businessProfile?.status).toBe("REJECTED");
  });
});
