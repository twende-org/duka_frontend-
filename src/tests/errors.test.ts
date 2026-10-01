import { describe, expect, it } from "vitest";
import { ApiError, apiErrorFromResponse, isAuthError, normalizeErrorDetail } from "@/lib/api/errors";

describe("normalizeErrorDetail", () => {
  it("reads the DRF {'detail': [...]} envelope", () => {
    expect(normalizeErrorDetail({ detail: ["This invitation is no longer pending."] })).toEqual([
      "This invitation is no longer pending.",
    ]);
  });

  it("reads a bare string detail and a bare array body", () => {
    expect(normalizeErrorDetail({ detail: "Not found." })).toEqual(["Not found."]);
    expect(normalizeErrorDetail(["Something failed"])).toEqual(["Something failed"]);
  });

  it("prefixes field errors with the field name", () => {
    expect(normalizeErrorDetail({ email: ["Enter a valid email."], role: ["Invalid role."] })).toEqual([
      "email: Enter a valid email.",
      "role: Invalid role.",
    ]);
  });

  it("leaves non_field_errors unprefixed", () => {
    expect(normalizeErrorDetail({ non_field_errors: ["Cannot pay more than the balance."] })).toEqual([
      "Cannot pay more than the balance.",
    ]);
  });

  it("walks nested error objects", () => {
    expect(normalizeErrorDetail({ items: { 0: { quantity: ["Must be positive."] } } })).toEqual([
      "items: quantity: Must be positive.",
    ]);
  });

  it("returns an empty list for empty bodies", () => {
    expect(normalizeErrorDetail(null)).toEqual([]);
    expect(normalizeErrorDetail("")).toEqual([]);
    expect(normalizeErrorDetail({})).toEqual([]);
  });
});

describe("apiErrorFromResponse", () => {
  it("carries status, messages and the raw body", () => {
    const error = apiErrorFromResponse(400, { detail: ["Bad input"] });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.detail).toEqual(["Bad input"]);
    expect(error.message).toBe("Bad input");
    expect(error.data).toEqual({ detail: ["Bad input"] });
    expect(error.isNetworkError).toBe(false);
  });

  it("falls back to a generic message for an empty body", () => {
    const error = apiErrorFromResponse(500, null);
    expect(error.detail).toEqual(["Request failed with status 500"]);
  });

  it("treats the HTML error page of a proxy as a single message", () => {
    const error = apiErrorFromResponse(502, "<html>Bad gateway</html>");
    expect(error.detail).toEqual(["<html>Bad gateway</html>"]);
  });
});

describe("isAuthError", () => {
  it("matches 401 and 403 only", () => {
    expect(isAuthError(apiErrorFromResponse(401, { detail: "nope" }))).toBe(true);
    expect(isAuthError(apiErrorFromResponse(403, { detail: "nope" }))).toBe(true);
    expect(isAuthError(apiErrorFromResponse(404, { detail: "nope" }))).toBe(false);
    expect(isAuthError(new Error("boom"))).toBe(false);
  });
});

describe("network failures", () => {
  it("are reported with status 0", () => {
    const error = new ApiError("Network request failed", {
      isNetworkError: true,
      detail: ["Failed to fetch"],
    });
    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
    expect(error.detail).toEqual(["Failed to fetch"]);
  });
});
