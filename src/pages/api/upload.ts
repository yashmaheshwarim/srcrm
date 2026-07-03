import type { NextApiRequest, NextApiResponse } from "next";
import { uploadFile, isStorageConfigured } from "@/lib/storage-service";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Allow large file uploads
    },
  },
};

type UploadResponse = {
  success: boolean;
  data?: {
    key: string;
    url: string;
    size: number;
    contentType: string;
    originalName: string;
    compressed: boolean;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Check if storage is configured
  if (!isStorageConfigured()) {
    return res.status(500).json({
      success: false,
      error: "Storage is not configured. Please set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET environment variables.",
    });
  }

  try {
    const { file, fileName, fileType, compress } = req.body;

    if (!file || !fileName || !fileType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: file, fileName, fileType",
      });
    }

    // Decode base64 file data
    const buffer = Buffer.from(file, "base64");
    if (buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "File content is empty or invalid",
      });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        error: "File size exceeds maximum limit of 50MB",
      });
    }

    // Upload with optional compression
    const shouldCompress = compress !== false;
    const result = await uploadFile(buffer, fileName, fileType, "uploads", shouldCompress);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        originalName: fileName,
        compressed: shouldCompress && buffer.length > result.size,
      },
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred during upload",
    });
  }
}