/**
 * Client-side image compression utility.
 * Compresses images above a size threshold using canvas downscaling + JPEG/WebP encoding.
 */

const DEFAULT_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const DEFAULT_MAX_DIMENSION = 2400; // max width or height in px
const DEFAULT_QUALITY = 0.82;

interface CompressOptions {
  /** Max file size in bytes before compression kicks in (default 20MB) */
  maxSizeBytes?: number;
  /** Max width/height in pixels (default 2400) */
  maxDimension?: number;
  /** JPEG/WebP quality 0-1 (default 0.82) */
  quality?: number;
}

/**
 * Returns the original file if it's not an image or already small enough.
 * Otherwise returns a compressed File (JPEG or WebP).
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
  } = options;

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip SVGs (can't canvas-compress them meaningfully)
  if (file.type === "image/svg+xml") return file;

  // Skip small files
  if (file.size <= maxSizeBytes) return file;

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Downscale if needed
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP, fallback to JPEG
      const outputType = "image/webp";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Compression failed — return original
            resolve(file);
            return;
          }

          // Build a new file with a corrected extension
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const ext = outputType === "image/webp" ? "webp" : "jpg";
          const compressed = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          // Only use compressed version if it's actually smaller
          resolve(compressed.size < file.size ? compressed : file);
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // on error, return original
    };

    img.src = url;
  });
}
