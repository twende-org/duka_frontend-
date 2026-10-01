import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataUrlToBlob, uploadImageOnApi } from "@/lib/api/domains/uploads";

const { clientMock } = vi.hoisted(() => {
  const fn = () => vi.fn();
  return { clientMock: { request: fn(), get: fn(), post: fn(), patch: fn(), put: fn(), del: fn() } };
});

vi.mock("@/lib/api/index", () => ({ getApiClient: () => clientMock }));

beforeEach(() => {
  for (const fn of Object.values(clientMock)) fn.mockReset();
});

// "AB" -> base64 "QUI="
const DATA_URL = "data:image/png;base64,QUI=";

describe("uploadImageOnApi", () => {
  it("posts the image as multipart and returns the media URL", async () => {
    clientMock.post.mockResolvedValue({ url: "http://api.test/media/uploads/products/a.png" });

    const url = await uploadImageOnApi(DATA_URL, { folder: "products", filename: "p.png" });

    expect(url).toBe("http://api.test/media/uploads/products/a.png");
    const [path, form] = clientMock.post.mock.calls[0];
    expect(path).toBe("/api/v1/uploads/");
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get("folder")).toBe("products");
    const file = (form as FormData).get("file") as File;
    expect(file.name).toBe("p.png");
    expect(file.type).toBe("image/png");
  });

  it("defaults to the products folder", async () => {
    clientMock.post.mockResolvedValue({ url: "http://api.test/media/uploads/products/a.jpg" });

    await uploadImageOnApi(DATA_URL);

    const form = clientMock.post.mock.calls[0][1] as FormData;
    expect(form.get("folder")).toBe("products");
  });

  it("accepts a File directly", async () => {
    clientMock.post.mockResolvedValue({ url: "http://api.test/media/uploads/shops/s.webp" });
    const file = new File([new Uint8Array([1, 2, 3])], "logo.webp", { type: "image/webp" });

    await uploadImageOnApi(file, { folder: "shops" });

    const form = clientMock.post.mock.calls[0][1] as FormData;
    expect((form.get("file") as File).name).toBe("logo.webp");
    expect(form.get("folder")).toBe("shops");
  });

  it("rejects a plain string that is not a data URL", async () => {
    await expect(uploadImageOnApi("not-an-image")).rejects.toThrow(/data URL/);
    expect(clientMock.post).not.toHaveBeenCalled();
  });

  it("rejects when the server answers without a url", async () => {
    clientMock.post.mockResolvedValue({});
    await expect(uploadImageOnApi(DATA_URL)).rejects.toThrow(/no image URL/);
  });

  it("propagates request failures so the caller can skip that image", async () => {
    clientMock.post.mockRejectedValue(new Error("boom"));
    await expect(uploadImageOnApi(DATA_URL)).rejects.toThrow("boom");
  });
});

describe("dataUrlToBlob", () => {
  it("decodes base64 payloads with their content type", () => {
    const blob = dataUrlToBlob(DATA_URL);
    expect(blob?.type).toBe("image/png");
    expect(blob?.size).toBe(2); // "AB"
  });

  it("returns null for non data URLs", () => {
    expect(dataUrlToBlob("https://cdn.example/a.png")).toBeNull();
  });
});
