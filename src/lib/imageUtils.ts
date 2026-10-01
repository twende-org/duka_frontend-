/**
 * Professional Image Compression Utility
 * Resizes and compresses images using the Canvas API.
 *
 * Uploading lives in ``src/lib/api/domains/uploads.ts``; this module only turns
 * a picked file into a compressed ``data:`` URL.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/jpeg" | "image/webp" | "image/png";
}

/**
 * Compresses a File or Blob and returns a base64 string.
 */
export async function compressImage(
  file: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7,
    format = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    const loadImage = (src: string) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Fill background with white for JPEGs (to avoid black transparency)
        if (format === "image/jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as base64
        const compressedBase64 = canvas.toDataURL(format, quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(new Error("Picha imeshindwa kufunguliwa"));
    };

    if (typeof file === "string") {
      loadImage(file);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        loadImage(event.target?.result as string);
      };
      reader.onerror = (err) => reject(new Error("Imeshindwa kusoma faili la picha"));
    }
  });
}

/**
 * Utility to compress multiple files sequentially.
 */
export async function compressImages(
  files: FileList | File[],
  options: CompressionOptions = {}
): Promise<string[]> {
  const fileArray = Array.from(files);
  const results: string[] = [];
  for (const file of fileArray) {
    const compressed = await compressImage(file, options);
    results.push(compressed);
  }
  return results;
}

/**
 * Twende Duka intake preset: invoices/QR photos are downscaled to 1600px on the
 * longest side and re-encoded as JPEG @ 75% before upload (spec Part 1).
 */
export async function compressIntakeImage(file: File | Blob): Promise<string> {
  return compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.75,
    format: "image/jpeg",
  });
}
