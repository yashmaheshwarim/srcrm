import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// ─── Configuration ──────────────────────────────────────────

interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string; // optional override for public URL
}

function getStorageConfig(): StorageConfig | null {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Required for Supabase/S3-compatible storage
  });
}

// ─── Helpers ────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StoredFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
  originalName: string;
  uploadedAt: string;
}

/**
 * Get the public URL for a stored object.
 * Constructs it from the S3-compatible endpoint + bucket + key pattern.
 */
function getPublicUrl(config: StorageConfig, key: string): string {
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }
  // Default: derive from endpoint
  // e.g. http://localhost:8000/storage/v1/s3/bucket-name/key
  const base = config.endpoint.replace(/\/+$/, "");
  return `${base}/${config.bucket}/${key}`;
}

/**
 * Generate a unique file key for storage.
 * Format: {prefix}/{uuid}-{originalName}
 */
function generateFileKey(originalName: string, prefix: string = "uploads"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${timestamp}-${random}-${sanitizedName}`;
}

/**
 * Detect if a file is an image based on MIME type.
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Determine if the file type is compressible.
 */
export function isCompressible(mimeType: string): boolean {
  const compressibleTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/tiff",
    "application/pdf",
  ];
  return compressibleTypes.includes(mimeType);
}

// ─── Compression ────────────────────────────────────────────

/**
 * Compress an image buffer using sharp.
 * Returns the compressed buffer and the new content type.
 * Falls back to original if compression fails or not an image.
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  quality: number = 80,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!isImage(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    const sharp = (await import("sharp")).default;
    let pipeline = sharp(buffer);

    // Determine output format
    switch (mimeType) {
      case "image/jpeg":
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case "image/png":
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case "image/webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "image/gif":
        // GIF compression is lossy; just return original
        return { buffer, mimeType };
      case "image/tiff":
        pipeline = pipeline.tiff({ quality });
        break;
      default:
        return { buffer, mimeType };
    }

    const compressed = await pipeline.toBuffer();
    return {
      buffer: compressed,
      mimeType: mimeType === "image/jpeg" ? "image/jpeg" : mimeType === "image/png" ? "image/png" : mimeType === "image/webp" ? "image/webp" : mimeType,
    };
  } catch (error) {
    console.warn("Image compression failed, using original:", error);
    return { buffer, mimeType };
  }
}

// ─── Upload / Download / Delete ────────────────────────────

/**
 * Upload a file buffer to Supabase Object Storage via S3 API.
 * Applies image compression before uploading.
 *
 * @param buffer - The raw file buffer
 * @param originalName - Original file name
 * @param mimeType - MIME type of the file
 * @param prefix - Folder prefix in the bucket (default: "uploads")
 * @param compress - Whether to compress images (default: true)
 * @returns UploadResult with key, url, size, contentType
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  prefix: string = "uploads",
  compress: boolean = true,
): Promise<UploadResult> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error(
      "Storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET in .env.local",
    );
  }

  // Compress if applicable
  let uploadBuffer = buffer;
  let uploadMimeType = mimeType;
  if (compress && isCompressible(mimeType)) {
    const result = await compressImage(buffer, mimeType);
    uploadBuffer = result.buffer;
    uploadMimeType = result.mimeType;
  }

  const key = generateFileKey(originalName, prefix);
  const client = createS3Client(config);

  try {
    const upload = new Upload({
      client,
      params: {
        Bucket: config.bucket,
        Key: key,
        Body: uploadBuffer,
        ContentType: uploadMimeType,
        CacheControl: "public, max-age=31536000, immutable",
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5MB parts for multipart upload
      leavePartsOnError: false,
    });

    await upload.done();

    return {
      key,
      url: getPublicUrl(config, key),
      size: uploadBuffer.length,
      contentType: uploadMimeType,
    };
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Upload a file from a File or Blob object (browser-side).
 * This is meant to be called from the server-side API route.
 */
export async function uploadFileFromStream(
  stream: NodeJS.ReadableStream,
  originalName: string,
  mimeType: string,
  prefix: string = "uploads",
  compress: boolean = true,
): Promise<UploadResult> {
  // Collect stream into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return uploadFile(buffer, originalName, mimeType, prefix, compress);
}

/**
 * Delete a file from storage by its key.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error("Storage is not configured");
  }

  const client = createS3Client(config);
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (error) {
    console.error("Delete failed:", error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * List files in a prefix/folder.
 */
export async function listFiles(prefix: string = "uploads"): Promise<{ key: string; size: number; lastModified?: Date }[]> {
  const config = getStorageConfig();
  if (!config) {
    throw new Error("Storage is not configured");
  }

  const client = createS3Client(config);
  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
      }),
    );

    return (response.Contents || []).map((item) => ({
      key: item.Key || "",
      size: item.Size || 0,
      lastModified: item.LastModified,
    }));
  } catch (error) {
    console.error("List failed:", error);
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Check if storage is configured.
 */
export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}