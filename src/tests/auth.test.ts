import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMeOnApi,
  fetchMyRolesOnApi,
  loginWithEmailOnApi,
  loginWithGoogleOnApi,
  logoutOnApi,
  registerWithEmailOnApi,
  updateMeOnApi,
} from "@/lib/api/domains/auth";

const { clientMock, sessionMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() },
    sessionMock: { setApiSession: vi.fn(), clearApiTokens: vi.fn() },
  };
});

vi.mock("@/lib/api/index", () => ({
  getApiClient: () => clientMock,
  setApiSession: sessionMock.setApiSession,
  clearApiTokens: sessionMock.clearApiTokens,
}));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
  for (const fn of Object.values(sessionMock)) fn.mockReset();
});

const BACKEND_USER = {
  id: "7",
  email: "buyer@test.com",
  display_name: "Buyer One",
  phone: "+255712000000",
  account_type: "merchant",
  capabilities: {
    can_manage_business: true,
    can_shop: true,
    can_buy_for_business: true,
  },
  roles: [{ id: "3", user_id: "7", shop_id: "11", role: "owner" }],
};

function authBody(overrides: Record<string, unknown> = {}) {
  return {
    access: "access-1",
    refresh: "refresh-1",
    is_new_user: false,
    user: BACKEND_USER,
    ...overrides,
  };
}

describe("loginWithEmailOnApi", () => {
  it("posts the credentials unauthenticated and stores the token pair", async () => {
    clientMock.post.mockResolvedValue(authBody());

    const session = await loginWithEmailOnApi("buyer@test.com", "secret1");

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/auth/login/",
      { email: "buyer@test.com", password: "secret1" },
      { auth: false }
    );
    expect(sessionMock.setApiSession).toHaveBeenCalledWith("access-1", "refresh-1");
    expect(session.isNewUser).toBe(false);
  });

  it("maps the snake_case payload to the camelCase profile", async () => {
    clientMock.post.mockResolvedValue(authBody());

    const { user, roles } = await loginWithEmailOnApi("buyer@test.com", "secret1");

    expect(user).toMatchObject({
      id: "7",
      displayName: "Buyer One",
      accountType: "merchant",
      capabilities: { canShop: true, canManageBusiness: true, canBuyForBusiness: true },
    });
    expect(roles).toEqual([{ id: "3", userId: "7", shopId: "11", role: "owner" }]);
  });

  it("does not store anything when the backend returns no tokens", async () => {
    clientMock.post.mockResolvedValue({ success: false });

    await loginWithEmailOnApi("buyer@test.com", "secret1");

    expect(sessionMock.setApiSession).not.toHaveBeenCalled();
  });

  it("propagates a rejected login so the caller can show the error", async () => {
    clientMock.post.mockRejectedValue(new Error("No active account found"));
    await expect(loginWithEmailOnApi("buyer@test.com", "nope")).rejects.toThrow(
      "No active account found"
    );
  });
});

describe("registerWithEmailOnApi", () => {
  it("posts camelCase fields and reports a new user", async () => {
    clientMock.post.mockResolvedValue(authBody({ is_new_user: true }));

    const session = await registerWithEmailOnApi({
      email: "new@test.com",
      password: "secret1",
      displayName: "New User",
      accountType: "unassigned",
    });

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/auth/register/",
      {
        email: "new@test.com",
        password: "secret1",
        displayName: "New User",
        phone: "",
        accountType: "unassigned",
      },
      { auth: false }
    );
    expect(session.isNewUser).toBe(true);
    expect(sessionMock.setApiSession).toHaveBeenCalledWith("access-1", "refresh-1");
  });
});

describe("loginWithGoogleOnApi", () => {
  it("exchanges the GIS credential for a Django session", async () => {
    clientMock.post.mockResolvedValue(authBody({ is_new_user: true }));

    const session = await loginWithGoogleOnApi("google-credential");

    expect(clientMock.post).toHaveBeenCalledWith(
      "/api/auth/google/",
      { idToken: "google-credential" },
      { auth: false }
    );
    expect(session.isNewUser).toBe(true);
    expect(session.user.email).toBe("buyer@test.com");
  });
});

describe("fetchMeOnApi", () => {
  it("defaults an empty body to a blank profile instead of throwing", async () => {
    clientMock.get.mockResolvedValue(null);

    const user = await fetchMeOnApi();

    expect(clientMock.get).toHaveBeenCalledWith("/api/users/me/");
    expect(user.id).toBe("");
    expect(user.capabilities).toEqual({
      canShop: false,
      canManageBusiness: false,
      canBuyForBusiness: false,
    });
  });

  it("keeps the default workspace the user picked", async () => {
    clientMock.get.mockResolvedValue({ ...BACKEND_USER, default_workspace: "customer" });

    await expect(fetchMeOnApi()).resolves.toMatchObject({ defaultWorkspace: "customer" });
  });

  it("maps the platform-admin flag from is_staff", async () => {
    clientMock.get.mockResolvedValue({ ...BACKEND_USER, is_staff: true });

    await expect(fetchMeOnApi()).resolves.toMatchObject({ isStaff: true });
  });

  it("defaults the platform-admin flag to false", async () => {
    clientMock.get.mockResolvedValue(BACKEND_USER);

    await expect(fetchMeOnApi()).resolves.toMatchObject({ isStaff: false });
  });

  it("maps and coerces the corporate profile", async () => {
    clientMock.get.mockResolvedValue({
      ...BACKEND_USER,
      corporate_profile: {
        company_id: "company-acme",
        company_name: "Acme Ltd",
        tin: "123-456",
        department_id: "dept-1",
        role: "approver",
        credit_limit: "5000000.00",
        credit_balance: 120000,
        status: "APPROVED",
        approved_at: "2026-09-30T09:00:00Z",
      },
    });

    const user = await fetchMeOnApi();

    expect(user.corporateProfile).toEqual({
      companyId: "company-acme",
      companyName: "Acme Ltd",
      tin: "123-456",
      vrn: undefined,
      departmentId: "dept-1",
      role: "approver",
      creditLimit: 5000000,
      creditBalance: 120000,
      status: "APPROVED",
      approvedAt: "2026-09-30T09:00:00Z",
    });
  });

  it("leaves the corporate profile absent for a plain shopper", async () => {
    clientMock.get.mockResolvedValue({ ...BACKEND_USER, corporate_profile: null });

    await expect(fetchMeOnApi()).resolves.toMatchObject({ corporateProfile: undefined });
  });
});

describe("fetchMyRolesOnApi", () => {
  it("asks for the caller's own roles and unwraps the DRF page", async () => {
    clientMock.get.mockResolvedValue({
      count: 1,
      results: [{ id: "3", userId: "7", shopId: "11", role: "manager" }],
    });

    const roles = await fetchMyRolesOnApi();

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/user-roles/", { query: { mine: true } });
    expect(roles).toEqual([{ id: "3", userId: "7", shopId: "11", role: "manager" }]);
  });
});

describe("updateMeOnApi", () => {
  it("translates the camelCase patch to the backend field names", async () => {
    clientMock.patch.mockResolvedValue({ ...BACKEND_USER, default_workspace: "customer" });

    const user = await updateMeOnApi({
      displayName: "Renamed",
      defaultWorkspace: "customer",
      accountType: "customer",
    });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/users/me/", {
      display_name: "Renamed",
      default_workspace: "customer",
      account_type: "customer",
    });
    expect(user.defaultWorkspace).toBe("customer");
  });

  it("sends only the fields the caller asked to change", async () => {
    clientMock.patch.mockResolvedValue(BACKEND_USER);

    await updateMeOnApi({ defaultWorkspace: "merchant" });

    expect(clientMock.patch).toHaveBeenCalledWith("/api/users/me/", {
      default_workspace: "merchant",
    });
  });
});

describe("logoutOnApi", () => {
  it("drops the stored token pair", () => {
    logoutOnApi();
    expect(sessionMock.clearApiTokens).toHaveBeenCalledTimes(1);
  });
});
