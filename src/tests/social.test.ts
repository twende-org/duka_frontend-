import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  disconnectFacebookPage,
  fetchFacebookConnection,
  fetchFacebookSessionPages,
  fetchSocialLogs,
  fromApiSocialLog,
  getFacebookCallbackUrl,
  postProductToFacebook,
  saveFacebookConnection,
  setFacebookAutoReply,
  toFacebookConnection,
  toFacebookPage,
} from "@/lib/api/domains/social";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const FACEBOOK_ROW = {
  id: "row-uuid-1",
  platform: "facebook",
  isConnected: true,
  pageId: "page-1",
  pageName: "Mama Shop",
  instagramId: "ig-1",
  autoReplyEnabled: true,
};

describe("toFacebookPage / toFacebookConnection", () => {
  it("keeps the page fields and passes the manual-flow token through", () => {
    expect(toFacebookPage({ id: "p1", name: "Shop", category: "Retail", access_token: "tok" })).toEqual({
      id: "p1",
      name: "Shop",
      category: "Retail",
      access_token: "tok",
    });
    // The secure session endpoint strips tokens, so they must stay optional.
    expect(toFacebookPage({ id: "p1", name: "Shop" }).access_token).toBeUndefined();
    expect(toFacebookPage(null).id).toBe("");
  });

  it("normalizes a connection row and defaults the switch to off", () => {
    expect(toFacebookConnection(FACEBOOK_ROW)).toEqual({
      id: "row-uuid-1",
      pageId: "page-1",
      pageName: "Mama Shop",
      instagramId: "ig-1",
      autoReplyEnabled: true,
    });
    expect(toFacebookConnection({ id: "r" }).autoReplyEnabled).toBe(false);
  });
});

describe("fetchFacebookConnection", () => {
  it("picks the facebook row for the shop", async () => {
    clientMock.get.mockResolvedValue({
      next: null,
      results: [{ id: "ig-row", platform: "instagram", isConnected: true }, FACEBOOK_ROW],
    });

    const connection = await fetchFacebookConnection("shop-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/social-integrations/", {
      query: { shopId: "shop-1", page_size: 200 },
    });
    expect(connection?.pageName).toBe("Mama Shop");
    expect(connection?.autoReplyEnabled).toBe(true);
  });

  it("returns null when there is no facebook row", async () => {
    clientMock.get.mockResolvedValue({ results: [{ id: "ig-row", platform: "instagram" }] });
    expect(await fetchFacebookConnection("shop-1")).toBeNull();
  });

  it("returns null for an unconnected row, mirroring the deleted-document rule", async () => {
    clientMock.get.mockResolvedValue({ results: [{ ...FACEBOOK_ROW, isConnected: false }] });
    expect(await fetchFacebookConnection("shop-1")).toBeNull();
  });
});

describe("disconnectFacebookPage", () => {
  it("finds the row and deletes it", async () => {
    clientMock.get.mockResolvedValue({ results: [FACEBOOK_ROW] });
    clientMock.del.mockResolvedValue(null);

    await disconnectFacebookPage("shop-1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/social-integrations/row-uuid-1/");
  });

  it("is a success when the shop has no facebook row (legacy deleteDoc semantics)", async () => {
    clientMock.get.mockResolvedValue({ results: [] });
    await disconnectFacebookPage("shop-1");
    expect(clientMock.del).not.toHaveBeenCalled();
  });
});

describe("setFacebookAutoReply", () => {
  it("patches the row", async () => {
    clientMock.get.mockResolvedValue({ results: [FACEBOOK_ROW] });
    clientMock.patch.mockResolvedValue({});

    await setFacebookAutoReply("shop-1", false);

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/social-integrations/row-uuid-1/", {
      autoReplyEnabled: false,
    });
  });

  it("fails when nothing is connected, like updateDoc on a missing document", async () => {
    clientMock.get.mockResolvedValue({ results: [] });
    await expect(setFacebookAutoReply("shop-1", true)).rejects.toThrow("not connected");
    expect(clientMock.patch).not.toHaveBeenCalled();
  });
});

describe("fetchFacebookSessionPages", () => {
  it("normalizes the bare session array (tokens are stripped server-side)", async () => {
    clientMock.get.mockResolvedValue([{ id: "p1", name: "Shop", category: "Retail" }]);

    const pages = await fetchFacebookSessionPages("session-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/social/facebook/sessions/session-1");
    expect(pages).toEqual([{ id: "p1", name: "Shop", category: "Retail", access_token: undefined }]);
    expect(pages[0].access_token).toBeUndefined();
  });

  it("also accepts a paginated envelope for future-proofing", async () => {
    clientMock.get.mockResolvedValue({ results: [{ id: "p2", name: "Other" }] });
    expect(await fetchFacebookSessionPages("s")).toEqual([
      { id: "p2", name: "Other", category: "", access_token: undefined },
    ]);
  });
});

describe("saveFacebookConnection", () => {
  it("posts the handoff and normalizes the result", async () => {
    clientMock.post.mockResolvedValue({ success: true, instagramLinked: true });

    const result = await saveFacebookConnection("shop-1", "page-1", "session-1");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/social/facebook/connections", {
      shopId: "shop-1",
      pageId: "page-1",
      sessionId: "session-1",
    });
    expect(result).toEqual({ success: true, instagramLinked: true });
  });

  it("coerces a malformed payload to not-linked instead of undefined", async () => {
    clientMock.post.mockResolvedValue(null);
    expect(await saveFacebookConnection("shop-1", "page-1", "s")).toEqual({
      success: false,
      instagramLinked: false,
    });
  });
});

describe("postProductToFacebook", () => {
  it("posts the product and normalizes both platform ids", async () => {
    clientMock.post.mockResolvedValue({
      success: true,
      facebookPostId: "fb-post-1",
      instagramPostId: "ig-post-1",
    });

    const result = await postProductToFacebook("shop-1", "prod-1", true);

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/social/facebook/posts", {
      shopId: "shop-1",
      productId: "prod-1",
      includeImage: true,
    });
    expect(result).toEqual({
      success: true,
      facebookPostId: "fb-post-1",
      instagramPostId: "ig-post-1",
    });
  });

  it("forwards an explicit message and keeps a text-only flag as sent", async () => {
    clientMock.post.mockResolvedValue({ success: true, facebookPostId: "fb-post-2" });

    const result = await postProductToFacebook("shop-1", "prod-1", false, "Bei poa!");

    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/social/facebook/posts", {
      shopId: "shop-1",
      productId: "prod-1",
      includeImage: false,
      message: "Bei poa!",
    });
    // Instagram was skipped server-side, so its id stays absent rather than "".
    expect(result).toEqual({ success: true, facebookPostId: "fb-post-2", instagramPostId: undefined });
  });

  it("coerces a malformed payload to a failed result", async () => {
    clientMock.post.mockResolvedValue(null);
    expect(await postProductToFacebook("shop-1", "prod-1", true)).toEqual({
      success: false,
      facebookPostId: undefined,
      instagramPostId: undefined,
    });
  });

  it("propagates a rejected promise so callers can toast the failure", async () => {
    clientMock.post.mockRejectedValue(new Error("Facebook is not connected for this shop."));
    await expect(postProductToFacebook("shop-1", "prod-1", true)).rejects.toThrow("not connected");
  });
});

describe("getFacebookCallbackUrl", () => {
  it("prefers the explicit VITE_FACEBOOK_REDIRECT_URI", () => {
    vi.stubEnv("VITE_FACEBOOK_REDIRECT_URI", " https://example.com/fb ");
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:8000");
    expect(getFacebookCallbackUrl()).toBe("https://example.com/fb");
  });

  it("derives the Django callback from an absolute API base", () => {
    vi.stubEnv("VITE_FACEBOOK_REDIRECT_URI", "");
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:8000/");
    expect(getFacebookCallbackUrl()).toBe("http://127.0.0.1:8000/api/v1/social/facebook/callback");
  });

  it("falls back to the page origin when the API is same-origin", () => {
    vi.stubEnv("VITE_FACEBOOK_REDIRECT_URI", "");
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(getFacebookCallbackUrl()).toBe(
      `${window.location.origin}/api/v1/social/facebook/callback`
    );
  });
});

describe("fromApiSocialLog", () => {
  it("normalizes a success row with both platform ids", () => {
    const row = fromApiSocialLog({
      id: "log-1",
      type: "social_post",
      action: "post",
      status: "success",
      facebookPostId: "fb-1",
      instagramPostId: "ig-1",
      productIds: ["p-1", "p-2"],
      createdAt: "2026-09-30T06:00:00Z",
    });

    expect(row.type).toBe("social_post");
    expect(row.facebookPostId).toBe("fb-1");
    expect(row.instagramPostId).toBe("ig-1");
    expect(row.productIds).toEqual(["p-1", "p-2"]);
    expect(row.createdAt).toBe("2026-09-30T06:00:00Z");
  });

  it("keeps the failure diagnostics and falls back to the log id key", () => {
    const row = fromApiSocialLog({
      log_id: "log-2",
      type: "ai_reply",
      action: "reply",
      status: "failure",
      error: "Facebook rejected the post",
      instagramError: "No image",
      videoFallbackReason: "ffmpeg missing",
      created_at: "2026-09-29T09:00:00Z",
    });

    expect(row.id).toBe("log-2");
    expect(row.error).toBe("Facebook rejected the post");
    expect(row.instagramError).toBe("No image");
    expect(row.videoFallbackReason).toBe("ffmpeg missing");
    expect(row.facebookPostId).toBeUndefined();
  });

  it("tolerates a null payload", () => {
    const row = fromApiSocialLog(null);
    expect(row.id).toBe("");
    expect(row.productIds).toBeUndefined();
  });
});

describe("fetchSocialLogs", () => {
  it("reads the shop's newest rows with the default page size", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [{ id: "l1", status: "success" }] });

    const rows = await fetchSocialLogs("shop-1");

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/social-logs/", {
      query: { shop_id: "shop-1", page_size: 20 },
    });
    expect(rows[0].id).toBe("l1");
  });

  it("clamps the page size and slices to the requested log count", async () => {
    clientMock.get.mockResolvedValueOnce({
      results: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
    });

    const rows = await fetchSocialLogs("shop-1", 2);

    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/social-logs/", {
      query: { shop_id: "shop-1", page_size: 2 },
    });
    expect(rows.map((r) => r.id)).toEqual(["l1", "l2"]);
  });

  it("caps an oversized request at DRF's max page size", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await fetchSocialLogs("shop-1", 9999);

    expect(clientMock.get.mock.calls[0][1].query.page_size).toBe(200);
  });

  it("falls back to the default when the count is zero", async () => {
    clientMock.get.mockResolvedValueOnce({ results: [] });

    await fetchSocialLogs("shop-1", 0);

    expect(clientMock.get.mock.calls[0][1].query.page_size).toBe(20);
  });
});
