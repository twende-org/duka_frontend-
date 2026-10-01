import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveIdentityOnApi } from "@/lib/api/domains/identity";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

describe("resolveIdentityOnApi", () => {
  it("posts the phone and email to the resolve endpoint", async () => {
    clientMock.post.mockResolvedValue({ success: true, linkedCount: 3 });

    const result = await resolveIdentityOnApi("0712345678", "buyer@test.com");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/identity/resolve/", {
      phone: "0712345678",
      email: "buyer@test.com",
    });
    expect(result).toEqual({ success: true, linkedCount: 3 });
  });

  it("counts zero links as a normal answer", async () => {
    clientMock.post.mockResolvedValue({ success: true, linkedCount: 0 });
    expect(await resolveIdentityOnApi("", "nobody@test.com")).toEqual({
      success: true,
      linkedCount: 0,
    });
  });

  it("survives a malformed body", async () => {
    clientMock.post.mockResolvedValue(null);
    expect(await resolveIdentityOnApi("0712345678", "")).toEqual({
      success: false,
      linkedCount: 0,
    });
  });

  it("propagates request failures so the caller can log and continue", async () => {
    clientMock.post.mockRejectedValue(new Error("boom"));
    await expect(resolveIdentityOnApi("0712345678", "")).rejects.toThrow("boom");
  });
});
