/**
 * High-performance client-side image compression for mobile and web.
 *
 * Shrinks massive phone camera photos (e.g. 10MB-25MB 4K/48MP captures)
 * down to ~250KB-400KB WebP/JPEG files before transmission. This:
 * 1. Prevents memory spikes and OOM crashes on the server (multer memory buffering).
 * 2. Accelerates multi-photo uploads over 3G/4G/WiFi by 10x-30x.
 * 3. Preserves visual sharpness with crisp bicubic/bilinear canvas sampling.
 */

export interface CompressionOptions {
  /** Maximum width or height in pixels. Defaults to 1920 (Full HD+). */
  maxDimension?: number;
  /** Compression quality between 0 and 1. Defaults to 0.82. */
  quality?: number;
  /** Target MIME format. Defaults to 'image/webp' with automatic JPEG fallback. */
  format?: 'image/webp' | 'image/jpeg';
  /** Minimum file size in bytes to trigger compression. Defaults to 250KB. */
  minSizeThreshold?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 1920,
  quality: 0.82,
  format: 'image/webp',
  minSizeThreshold: 250 * 1024, // 250 KB
};

/**
 * Checks whether the current browser supports canvas export to WebP.
 */
function supportsWebPExport(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Compresses an image File or Blob using HTML5 Canvas or ImageBitmap.
 * Falls back safely to the original file if decoding or canvas fails.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If not running in browser, or file is not an image, return unchanged
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  const opts: Required<CompressionOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Skip small files (under threshold) if they don't need dimension resizing
  // GIF and SVG should never be raster compressed through canvas
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // Determine output MIME type
  const targetFormat =
    opts.format === 'image/webp' && supportsWebPExport()
      ? 'image/webp'
      : 'image/jpeg';

  try {
    // 1. Decode image dimensions
    let width = 0;
    let height = 0;
    let sourceDrawable: ImageBitmap | HTMLImageElement;

    if (typeof createImageBitmap === 'function') {
      try {
        const bmp = await createImageBitmap(file);
        width = bmp.width;
        height = bmp.height;
        sourceDrawable = bmp;
      } catch {
        sourceDrawable = await loadImageElement(file);
        width = sourceDrawable.naturalWidth || sourceDrawable.width;
        height = sourceDrawable.naturalHeight || sourceDrawable.height;
      }
    } else {
      sourceDrawable = await loadImageElement(file);
      width = sourceDrawable.naturalWidth || sourceDrawable.width;
      height = sourceDrawable.naturalHeight || sourceDrawable.height;
    }

    // If image is already smaller than threshold and within max dimensions, skip compression
    if (
      file.size <= opts.minSizeThreshold &&
      width <= opts.maxDimension &&
      height <= opts.maxDimension
    ) {
      if ('close' in sourceDrawable && typeof sourceDrawable.close === 'function') {
        sourceDrawable.close();
      }
      return file;
    }

    // 2. Compute proportional target dimensions
    let targetWidth = width;
    let targetHeight = height;

    if (targetWidth > opts.maxDimension || targetHeight > opts.maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * opts.maxDimension) / targetWidth);
        targetWidth = opts.maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * opts.maxDimension) / targetHeight);
        targetHeight = opts.maxDimension;
      }
    }

    // 3. Render into Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      if ('close' in sourceDrawable && typeof sourceDrawable.close === 'function') {
        sourceDrawable.close();
      }
      return file;
    }

    // High quality bicubic interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill white background for transparent PNG converted to JPEG
    if (targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(sourceDrawable, 0, 0, targetWidth, targetHeight);

    // Free memory of ImageBitmap immediately
    if ('close' in sourceDrawable && typeof sourceDrawable.close === 'function') {
      sourceDrawable.close();
    }

    // 4. Export compressed Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        targetFormat,
        opts.quality
      );
    });

    if (!blob) {
      return file;
    }

    // Clean up canvas
    canvas.width = 0;
    canvas.height = 0;

    // Check if compression actually saved space
    if (blob.size >= file.size && width <= opts.maxDimension && height <= opts.maxDimension) {
      return file;
    }

    // Generate output file with appropriate extension
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const extension = targetFormat === 'image/webp' ? '.webp' : '.jpg';
    const newFileName = `${baseName}${extension}`;

    return new File([blob], newFileName, {
      type: targetFormat,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[imageCompression] Client-side compression failed, using original file:', err);
    return file;
  }
}

/**
 * Compresses an array of image Files concurrently with concurrency limit.
 */
export async function compressImageFiles(
  files: File[] | FileList,
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const fileArray = Array.from(files);
  const results: File[] = [];
  let completed = 0;

  // Process in small batches of 3 to avoid blocking browser main thread
  const BATCH_SIZE = 3;
  for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
    const batch = fileArray.slice(i, i + BATCH_SIZE);
    const compressedBatch = await Promise.all(
      batch.map((f) => compressImageFile(f, options))
    );
    results.push(...compressedBatch);
    completed += batch.length;
    onProgress?.(completed, fileArray.length);
  }

  return results;
}

/**
 * Fallback helper to load an image into an HTMLImageElement using object URL.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
