import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyIntakeBatch,
  createIntakeBatch,
  deleteIntakeDraft,
  fromApiIntakeBatch,
  fromApiIntakeDraft,
  getIntakeBatches,
  updateIntakeDraft,
} from "@/lib/api/domains/intake";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

const BATCH_ROW = {
  id: "batch-1",
  shopId: "shop-1",
  status: "completed",
  sourceType: "qr",
  engineUsed: "qr",
  sources: [{ kind: "qr", name: "invoice-qr" }],
  errorMessage: "",
  itemCount: 1,
  drafts: [
    {
      id: "draft-1",
      batchId: "batch-1",
      nameEn: "Sukari 1kg",
      nameSw: "Sukari 1kg",
      unit: "pcs",
      quantity: 24,
      buyingPrice: "2500",
      sellingPrice: "3000",
      categoryName: "Vyakula",
      aiConfidenceScore: 1,
      traItemCode: "VAT_STD",
      taxRatePercent: "18.00",
      appliedProductId: null,
      createdAt: "2026-09-30T08:00:00Z",
      updatedAt: "2026-09-30T08:00:00Z",
    },
  ],
};

describe("fromApiIntakeBatch", () => {
  it("normalizes a full DRF batch with its drafts", () => {
    const batch = fromApiIntakeBatch(BATCH_ROW);
    expect(batch.status).toBe("completed");
    expect(batch.engineUsed).toBe("qr");
    expect(batch.sources).toEqual([{ kind: "qr", name: "invoice-qr", ref: undefined, contentType: undefined }]);
    expect(batch.drafts[0]).toMatchObject({
      id: "draft-1",
      nameEn: "Sukari 1kg",
      quantity: 24,
      buyingPrice: 2500,
      sellingPrice: 3000,
      taxRatePercent: 18,
      aiConfidenceScore: 1,
    });
  });

  it("falls back to safe defaults on malformed rows", () => {
    const batch = fromApiIntakeBatch(null);
    expect(batch.status).toBe("pending");
    expect(batch.sourceType).toBe("image");
    expect(batch.itemCount).toBe(0);
    expect(batch.drafts).toEqual([]);
  });

  it("keeps a parsed draft decimal numeric", () => {
    const draft = fromApiIntakeDraft({ id: "d", nameEn: "X", aiConfidenceScore: "0.42" });
    expect(draft.aiConfidenceScore).toBeCloseTo(0.42);
  });
});

describe("getIntakeBatches", () => {
  it("walks paginated DRF results", async () => {
    clientMock.get
      .mockResolvedValueOnce({ results: [BATCH_ROW], next: "http://api.test/api/v1/inventory/intake/?page=2" })
      .mockResolvedValueOnce({ results: [], next: null });

    const batches = await getIntakeBatches("shop-1");

    expect(batches).toHaveLength(1);
    expect(clientMock.get.mock.calls[0][0]).toBe("/api/v1/inventory/intake/");
    expect(clientMock.get.mock.calls[0][1]).toEqual({ query: { shop_id: "shop-1", page_size: 200 } });
    expect(clientMock.get.mock.calls[1][0]).toBe("/api/v1/inventory/intake/?page=2");
  });
});

describe("createIntakeBatch", () => {
  it("posts QR payloads and URLs as JSON when there are no images", async () => {
    clientMock.post.mockResolvedValue(BATCH_ROW);

    await createIntakeBatch({
      shopId: "shop-1",
      qrPayloads: ['{"type":"twendeduka.wholesale.v1"}'],
      imageUrl: ["https://cdn.example/a.jpg"],
    });

    const [path, body] = clientMock.post.mock.calls[0];
    expect(path).toBe("/api/v1/inventory/intake/");
    expect(body).toEqual({
      shopId: "shop-1",
      sourceNote: "",
      imageUrls: ["https://cdn.example/a.jpg"],
      qrPayloads: ['{"type":"twendeduka.wholesale.v1"}'],
    });
  });

  it("sends compressed data URLs as multipart image files", async () => {
    clientMock.post.mockResolvedValue(BATCH_ROW);
    // "AB" -> base64 "QUI="
    const dataUrl = "data:image/jpeg;base64,QUI=";

    await createIntakeBatch({ shopId: "shop-1", imageDataUrls: [dataUrl], note: "karatasi" });

    const [path, form] = clientMock.post.mock.calls[0];
    expect(path).toBe("/api/v1/inventory/intake/");
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("shopId")).toBe("shop-1");
    expect(form.get("sourceNote")).toBe("karatasi");
    const file = form.get("images") as File;
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBe(2);
  });

  it("rejects non-data-URL image payloads", async () => {
    await expect(
      createIntakeBatch({ shopId: "shop-1", imageDataUrls: ["https://cdn.example/a.jpg"] })
    ).rejects.toThrow(/data URL/);
    expect(clientMock.post).not.toHaveBeenCalled();
  });
});

describe("draft lifecycle", () => {
  it("patches only the provided editable fields", async () => {
    clientMock.patch.mockResolvedValue({ ...BATCH_ROW.drafts[0], quantity: 30 });

    const draft = await updateIntakeDraft("draft-1", { quantity: 30, sellingPrice: 950 });

    expect(draft.quantity).toBe(30);
    expect(clientMock.patch).toHaveBeenCalledWith(
      "/api/v1/inventory/intake-drafts/draft-1/",
      { quantity: 30, sellingPrice: 950 }
    );
  });

  it("deletes a draft row", async () => {
    clientMock.del.mockResolvedValue(undefined);
    await deleteIntakeDraft("draft-1");
    expect(clientMock.del).toHaveBeenCalledWith("/api/v1/inventory/intake-drafts/draft-1/");
  });

  it("unwraps the apply summary", async () => {
    clientMock.post.mockResolvedValue({ summary: { created: 2, updated: 1, skipped: 0 } });

    const summary = await applyIntakeBatch("batch-1");

    expect(summary).toEqual({ created: 2, updated: 1, skipped: 0 });
    expect(clientMock.post).toHaveBeenCalledWith("/api/v1/inventory/intake/batch-1/apply/");
  });
});
