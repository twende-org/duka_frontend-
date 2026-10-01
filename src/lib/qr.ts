/**
 * QR decoding from a still image (uploaded photo), complementing the live
 * camera scanner in QrScanner. Both use jsQR on canvas ImageData.
 */
import jsQR from "jsqr";

const MAX_DECODE_SIDE = 1200;

export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  const img = new Image();
  img.src = dataUrl;
  try {
    await img.decode();
  } catch {
    return null;
  }

  const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(img.width, img.height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
  const payload = code?.data?.trim();
  return payload ? payload : null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Imeshindwa kusoma faili"));
    reader.readAsDataURL(file);
  });
}

export interface QrProductHints {
  name?: string;
  barcode?: string;
}

/**
 * What the QR printed on a product carries: an 8–14 digit barcode number, a
 * storefront URL, or a plain product name. Returns null for payloads we
 * cannot read as a single product (JSON/layouts) so callers can route them
 * to the batch pipeline instead of pre-filling the form with garbage.
 */
export function productHintsFromQrPayload(payload: string): QrProductHints | null {
  const text = payload.trim();
  if (!text || text.length > 300) return null;
  if (text.startsWith("{") || text.startsWith("<")) return null;
  if (/^\d{8,14}$/.test(text)) return { barcode: text };
  if (/^https?:\/\//i.test(text)) {
    let path = text;
    try {
      path = new URL(text).pathname;
    } catch {
      // keep the raw text; the slug extraction below still applies
    }
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    const cleaned = slug.replace(/\.[a-z0-9]+$/i, "").replace(/[-_+]+/g, " ").trim();
    return cleaned ? { name: cleaned } : null;
  }
  return { name: text.slice(0, 200) };
}
