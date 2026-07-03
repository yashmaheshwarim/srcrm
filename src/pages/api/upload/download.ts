import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

type DownloadResponse = {
  success: boolean;
  error?: string;
};

interface FileSpec {
  key: string;
  originalName: string;
}

/**
 * API route to download multiple files as a zip archive.
 * POST with: { files: [{ key, originalName }], folderName: "CustomerName-123" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DownloadResponse | Buffer>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return res.status(500).json({
      success: false,
      error: "Storage is not configured.",
    });
  }

  try {
    const { files, folderName } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: files (array of {key, originalName})",
      });
    }

    const client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    // Download all files from S3 in parallel
    const downloadedFiles = await Promise.all(
      files.map(async (file: FileSpec) => {
        try {
          const response = await client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: file.key,
            }),
          );

          const chunks: Buffer[] = [];
          for await (const chunk of response.Body as any) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);

          return {
            buffer,
            originalName: file.originalName,
          };
        } catch (err) {
          console.error(`Failed to download ${file.key}:`, err);
          return null;
        }
      }),
    );

    // Filter out failed downloads
    const validFiles = downloadedFiles.filter((f): f is NonNullable<typeof f> => f !== null);

    if (validFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No files could be downloaded from storage",
      });
    }

    // Create zip archive
    const archiver = (await import("archiver")) as unknown as (...args: any[]) => any;
    const arch = archiver("zip", { zlib: { level: 6 } });

    // Collect zip buffer
    const chunks: Buffer[] = [];
    arch.on("data", (chunk: Buffer) => chunks.push(chunk));
    arch.on("error", (err: Error) => {
      throw new Error(`Archive error: ${err.message}`);
    });

    const zipPromise = new Promise<void>((resolve) => {
      arch.on("end", () => resolve());
    });

    // Add each file to the zip
    for (const file of validFiles) {
      arch.append(file.buffer, { name: file.originalName });
    }

    await arch.finalize();
    await zipPromise;

    const zipBuffer = Buffer.concat(chunks);
    const safeName = (folderName || "documents").replace(/[^a-zA-Z0-9_-]/g, "_");

    // Set response headers for zip download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.zip"`,
    );
    res.setHeader("Content-Length", zipBuffer.length);

    return res.status(200).send(zipBuffer);
  } catch (error) {
    console.error("Download API error:", error);
    // Only send JSON if we haven't started streaming
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to download files",
    });
  }
}