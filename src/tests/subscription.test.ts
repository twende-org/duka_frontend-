import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSystemAdmin } from "@/lib/subscription";

const { fetchMeOnApiMock } = vi.hoisted(() => ({ fetchMeOnApiMock: vi.fn() }));

vi.mock("@/lib/api/domains/auth", () => ({ fetchMeOnApi: fetchMeOnApiMock }));

beforeEach(() => {
  fetchMeOnApiMock.mockReset();
});

const PROFILE = { id: "7", email: "admin@test.com", displayName: "Admin" };

describe("isSystemAdmin", () => {
  it("treats Django's is_staff flag as the platform-admin marker", async () => {
    fetchMeOnApiMock.mockResolvedValue({ ...PROFILE, isStaff: true });

    // The legacy uid argument is ignored: the JWT identifies the caller.
    await expect(isSystemAdmin("legacy-uid-1")).resolves.toBe(true);
    expect(fetchMeOnApiMock).toHaveBeenCalled();
  });

  it("returns false for a regular merchant", async () => {
    fetchMeOnApiMock.mockResolvedValue(PROFILE);

    await expect(isSystemAdmin("7")).resolves.toBe(false);
  });

  it("propagates a failed lookup so the gate can deny access", async () => {
    fetchMeOnApiMock.mockRejectedValue(new Error("401"));

    await expect(isSystemAdmin("7")).rejects.toThrow("401");
  });
});
