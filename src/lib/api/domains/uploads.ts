import { getApiClient } from "../index";

/**
 * Image uploads for the Django deployment (Django media endpoint).
 *
 * ``uploadImageOnApi`` posts the compressed image as multipart and answers with
 * the media URL to store in ``imageUrl``/``imageUrls``.
 */

/** Storage kinds the Django upload endpoint accepts. */
export type UploadKind = "products" | "shops" | "expenses" | "customers" | "avatars";

const DATA_URL_PATTERN = /^data:([^;,]+)?;base64,(.*)$/s;

/** Converts a ``data:`` URL into a Blob, or returns null for other strings. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1] || "application/octet-stream";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function fileNameFor(data: File | Blob, fallback: string): string {
  if (typeof File !== "undefined" && data instanceof File && data.name) return data.name;
  return fallback;
}

export async function uploadImageOnApi(
  data: File | Blob | string,
  options: { folder?: UploadKind; filename?: string } = {}
): Promise<string> {
  const form = new FormData();
  if (typeof data === "string") {
    const blob = dataUrlToBlob(data);
    if (!blob) throw new Error("Image upload expects a data URL, File or Blob");
    form.append("file", blob, options.filename ?? "image.jpg");
  } else {
    form.append("file", data, options.filename ?? fileNameFor(data, "image.jpg"));
  }
  form.append("folder", options.folder ?? "products");

  const body = await getApiClient().post<{ url?: string }>("/api/v1/uploads/", form);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url) throw new Error("Upload succeeded but no image URL was returned");
  return url;
}
