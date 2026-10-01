import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchActiveAnnouncement,
  fetchAnnouncements,
  fromApiAnnouncement,
  setAnnouncementActive,
} from "@/lib/api/domains/announcements";

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

describe("fromApiAnnouncement", () => {
  it("normalizes a DRF row and keeps the audit fields", () => {
    const announcement = fromApiAnnouncement({
      id: "ann-1",
      title: "Maintenance",
      message: "Tunafanya uboreshaji",
      type: "warning",
      active: false,
      createdAt: "2026-09-29T08:00:00Z",
      createdBy: "user-1",
      createdByEmail: "admin@test.com",
    });

    expect(announcement).toEqual({
      id: "ann-1",
      title: "Maintenance",
      message: "Tunafanya uboreshaji",
      type: "warning",
      active: false,
      createdAt: "2026-09-29T08:00:00Z",
      createdBy: "user-1",
      createdByEmail: "admin@test.com",
    });
  });

  it("falls back to an active info row on junk input", () => {
    const announcement = fromApiAnnouncement({ type: "nonsense" });

    expect(announcement.type).toBe("info");
    expect(announcement.active).toBe(true);
    expect(announcement.title).toBe("");
    expect(announcement.createdBy).toBeUndefined();
  });
});

describe("reads", () => {
  it("asks for the newest live row for the banner", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 1, results: [{ id: "ann-1", title: "Hi", type: "info" }] });

    const announcement = await fetchActiveAnnouncement();

    expect(announcement?.id).toBe("ann-1");
    expect(clientMock.get).toHaveBeenCalledWith("/api/v1/announcements/", {
      query: { active: "true", page_size: 1 },
    });
  });

  it("answers null when nothing is live", async () => {
    clientMock.get.mockResolvedValueOnce({ count: 0, results: [] });

    await expect(fetchActiveAnnouncement()).resolves.toBeNull();
  });

  it("walks DRF page links for the admin list", async () => {
    clientMock.get
      .mockResolvedValueOnce({ next: "http://testserver/api/v1/announcements/?page=2", results: [{ id: "a1" }] })
      .mockResolvedValueOnce({ next: null, results: [{ id: "a2" }] });

    const announcements = await fetchAnnouncements();

    expect(announcements.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/api/v1/announcements/", {
      query: { page_size: 200 },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/api/v1/announcements/?page=2", undefined);
  });
});

describe("writes", () => {
  it("creates with only the form fields; the server stamps the author", async () => {
    clientMock.post.mockResolvedValue({ id: "ann-9", title: "T", message: "M", type: "success", active: true });

    const created = await createAnnouncement({ title: "T", message: "M", type: "success" });

    expect(created.id).toBe("ann-9");
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/announcements/", {
      title: "T",
      message: "M",
      type: "success",
    });
  });

  it("toggles the active flag by the app-visible id", async () => {
    clientMock.patch.mockResolvedValue({ id: "ann-1", active: false });

    await setAnnouncementActive("ann-1", false);

    expect(clientMock.patch).toHaveBeenCalledWith("/api/v1/announcements/ann-1/", { active: false });
  });

  it("deletes by the app-visible id", async () => {
    clientMock.del.mockResolvedValue(null);

    await deleteAnnouncement("ann-1");

    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/announcements/ann-1/");
  });
});
