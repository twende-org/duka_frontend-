import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptInvitation,
  addBranch,
  addShop,
  addStockTransfer,
  assignUserRole,
  cancelInvitation,
  cancelStockTransfer,
  completeStockTransfer,
  declineInvitation,
  deleteBranch,
  deleteShop,
  fromApiBranch,
  fromApiInvitation,
  fromApiShop,
  fromApiShopMemberRole,
  fromApiStockTransfer,
  getBranches,
  getInvitationsByEmail,
  getAllShopsAdmin,
  getShopInvitations,
  getShops,
  getShopUsers,
  getStockTransfers,
  removeUserRole,
  sendInvitation,
  updateBranch,
  updateShop,
} from "@/lib/api/domains/shops";

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

describe("fromApiShop", () => {
  it("prefers the legacy id so joins keep working", () => {
    const shop = fromApiShop({ id: "uuid-1", legacyId: "legacy-1", name: "Mama Duka" });

    expect(shop.id).toBe("legacy-1");
    expect(shop.name).toBe("Mama Duka");
  });

  it("falls back to the uuid and reads snake_case keys", () => {
    const shop = fromApiShop({
      id: "uuid-2",
      name: "Juma Store",
      whatsapp: "+255700000000",
      follower_count: 12,
      setup_status: undefined,
      productCategories: ["phones"],
    });

    expect(shop.id).toBe("uuid-2");
    expect(shop.whatsappNumber).toBe("+255700000000");
    expect(shop.followerCount).toBe(12);
    expect(shop.categories).toEqual(["phones"]);
    expect(shop.productCategories).toEqual(["phones"]);
    expect(shop.ownerId).toBe("");
  });

  it("picks up the derived salesTotal the admin list shows", () => {
    const shop = fromApiShop({ id: "uuid-3", name: "Pesa Shop", salesTotal: 12345.5 });

    expect(shop.salesTotal).toBe(12345.5);
    expect(fromApiShop({ id: "uuid-4" }).salesTotal).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    expect(fromApiShop(null).id).toBe("");
  });
});

describe("getShops / getAllShopsAdmin", () => {
  it("walks every page", async () => {
    clientMock.get
      .mockResolvedValueOnce({
        next: "http://testserver/api/v1/shops/?page=2&page_size=200",
        results: [{ id: "s1" }],
      })
      .mockResolvedValueOnce({ next: null, results: [{ id: "s2", legacyId: "legacy-2" }] });

    const shops = await getShops("user-1");

    expect(shops.map((s) => s.id)).toEqual(["s1", "legacy-2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/shops/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/shops/?page=2&page_size=200",
      undefined
    );
  });

  it("reads the same endpoint for admins", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await getAllShopsAdmin();

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/shops/", { query: { page_size: 200 } });
  });
});

describe("addShop / updateShop / deleteShop", () => {
  it("flattens the onboarding legal block and answers the app-visible id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "uuid-9", legacyId: "legacy-9" });

    const id = await addShop({
      name: "Mama Duka",
      location: "Kariakoo",
      ownerId: "user-1",
      whatsappNumber: "+255700000000",
      legal: {
        tin: "123-456",
        vrn: "VRN-1",
        licenseNumber: "LIC-1",
        registrationNumber: "REG-1",
      },
    } as never);

    expect(id).toBe("legacy-9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/shops/", {
      name: "Mama Duka",
      location: "Kariakoo",
      ownerId: "user-1",
      whatsappNumber: "+255700000000",
      tin_number: "123-456",
      vrn_number: "VRN-1",
      license_number: "LIC-1",
      registration_number: "REG-1",
    });
  });

  it("patches by the encoded id", async () => {
    clientMock.patch.mockResolvedValueOnce({ id: "legacy 1", name: "Renamed" });

    const shop = await updateShop("legacy 1", { name: "Renamed" });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/shops/legacy%201/", {
      name: "Renamed",
    });
    expect(shop.name).toBe("Renamed");
  });

  it("deletes by the encoded id", async () => {
    clientMock.del.mockResolvedValueOnce(null);

    await deleteShop("legacy 1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/shops/legacy%201/");
  });
});

describe("branches", () => {
  it("normalizes alias fields", () => {
    const branch = fromApiBranch({
      id: "b1",
      shop: "shop-1",
      name: "Main Branch",
      is_active: true,
      branch_type: "Storefront",
      operating_hours: "8-6",
    });

    expect(branch.shopId).toBe("shop-1");
    expect(branch.isActive).toBe(true);
    expect(branch.type).toBe("Storefront");
    expect(branch.operatingHours).toBe("8-6");
  });

  it("filters the list by the shop", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "b1", shopId: "s1" }] });

    const branches = await getBranches("s1");

    expect(branches[0].shopId).toBe("s1");
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/branches/", {
      query: { shop_id: "s1", page_size: 200 },
    });
  });

  it("creates, updates and deletes by id", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "b9" });
    clientMock.patch.mockResolvedValueOnce({ id: "b9", name: "Depot" });
    clientMock.del.mockResolvedValueOnce(null);

    const created = await addBranch({ shopId: "s1", name: "Depot" } as never);
    const updated = await updateBranch("b9", { name: "Depot" });
    await deleteBranch("b9");

    expect(created).toBe("b9");
    expect(updated.name).toBe("Depot");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/branches/", {
      shopId: "s1",
      name: "Depot",
    });
    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/branches/b9/", { name: "Depot" });
    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/branches/b9/");
  });
});

describe("stock transfers", () => {
  it("normalizes the row", () => {
    const transfer = fromApiStockTransfer({
      id: "t1",
      shopId: "s1",
      fromBranchId: "b1",
      toBranchId: "b2",
      productId: "p1",
      productName: "Sukari 1kg",
      quantity: 5,
      status: "pending",
      createdBy: "u1",
    });

    expect(transfer.productName).toBe("Sukari 1kg");
    expect(transfer.status).toBe("pending");
  });

  it("walks the shop's transfers", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "t1" }] });

    await getStockTransfers("s1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/stock-transfers/", {
      query: { shop_id: "s1", page_size: 200 },
    });
  });

  it("posts, completes and cancels", async () => {
    clientMock.post
      .mockResolvedValueOnce({ id: "t1" })
      .mockResolvedValueOnce({ id: "t1", status: "completed" })
      .mockResolvedValueOnce({ id: "t1", status: "cancelled" });

    const id = await addStockTransfer({ shopId: "s1", quantity: 5 } as never);
    const completed = await completeStockTransfer("t1");
    const cancelled = await cancelStockTransfer("t1");

    expect(id).toBe("t1");
    expect(completed.status).toBe("completed");
    expect(cancelled.status).toBe("cancelled");
    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/stock-transfers/", {
      shopId: "s1",
      quantity: 5,
    });
    expect(clientMock.post).toHaveBeenNthCalledWith(2, "/api/v1/stock-transfers/t1/complete/");
    expect(clientMock.post).toHaveBeenNthCalledWith(3, "/api/v1/stock-transfers/t1/cancel/");
  });
});

describe("staff roles", () => {
  it("normalizes ids and names", () => {
    const role = fromApiShopMemberRole({
      id: "r1",
      userId: "u1",
      shopId: "s1",
      role: "manager",
      displayName: "Mama Asha",
      email: "mama@test.com",
    });

    expect(role.userId).toBe("u1");
    expect(role.role).toBe("manager");
    expect(role.displayName).toBe("Mama Asha");
  });

  it("lists the shop's members", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "r1", userId: "u1" }] });

    const roles = await getShopUsers("s1");

    expect(roles).toHaveLength(1);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/user-roles/", {
      query: { shop_id: "s1", page_size: 200 },
    });
  });

  it("assigns through the upsert endpoint", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "r1", userId: "u1", shopId: "s1", role: "owner" });

    const role = await assignUserRole("u1", "s1", "owner");

    expect(role.role).toBe("owner");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/user-roles/", {
      userId: "u1",
      shopId: "s1",
      role: "owner",
    });
  });

  it("deletes the resolved role row", async () => {
    clientMock.get.mockResolvedValueOnce({
      next: null,
      results: [{ id: "r1", userId: "u1", shopId: "s1", role: "manager" }],
    });
    clientMock.del.mockResolvedValueOnce(null);

    await removeUserRole("u1", "s1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/user-roles/", {
      query: { shop_id: "s1", user_id: "u1", page_size: 200 },
    });
    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/user-roles/r1/");
  });

  it("is a no-op when the member holds no role", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [] });

    await removeUserRole("ghost", "s1");

    expect(clientMock.del).not.toHaveBeenCalled();
  });
});

describe("invitations", () => {
  it("normalizes the row", () => {
    const invitation = fromApiInvitation({
      id: "i1",
      email: "juma@test.com",
      shopId: "s1",
      role: "attendant",
      status: "pending",
      invitedBy: "u1",
      shopName: "Mama Duka",
      createdAt: "2026-09-30T06:00:00Z",
    });

    expect(invitation.shopName).toBe("Mama Duka");
    expect(invitation.invitedBy).toBe("u1");
  });

  it("lists the shop's pending invitations", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "i1" }] });

    await getShopInvitations("s1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/invitations/", {
      query: { shop_id: "s1", status: "pending", page_size: 200 },
    });
  });

  it("lists the caller's own pending invitations", async () => {
    clientMock.get.mockResolvedValueOnce({ next: null, results: [{ id: "i2" }] });

    const invitations = await getInvitationsByEmail("juma@test.com");

    expect(invitations).toHaveLength(1);
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/invitations/", {
      query: { mine: "true", status: "pending", page_size: 200 },
    });
  });

  it("sends only the fields the server needs", async () => {
    clientMock.post.mockResolvedValueOnce({ id: "i3", email: "juma@test.com" });

    const id = await sendInvitation({
      email: "Juma@Test.com",
      shopId: "s1",
      role: "manager",
      invitedBy: "u1",
      shopName: "Mama Duka",
    } as never);

    expect(id).toBe("i3");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/invitations/", {
      shopId: "s1",
      email: "Juma@Test.com",
      role: "manager",
    });
  });

  it("withdraws, accepts and declines by action path", async () => {
    clientMock.del.mockResolvedValueOnce(null);
    clientMock.post
      .mockResolvedValueOnce({ id: "i1", status: "accepted" })
      .mockResolvedValueOnce({ id: "i1", status: "declined" });

    await cancelInvitation("i1");
    const accepted = await acceptInvitation("i1", "u1");
    const declined = await declineInvitation("i1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/invitations/i1/");
    expect(accepted.status).toBe("accepted");
    expect(declined.status).toBe("declined");
    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/api/v1/invitations/i1/accept/");
    expect(clientMock.post).toHaveBeenNthCalledWith(2, "/api/v1/invitations/i1/decline/");
  });
});
