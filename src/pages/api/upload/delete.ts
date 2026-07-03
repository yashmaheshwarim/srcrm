import type { NextApiRequest, NextApiResponse } from "next";
import { deleteFile, isStorageConfigured } from "@/lib/storage-service";

type DeleteResponse = {
  success: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse>,
) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!isStorageConfigured()) {
    return res.status(500).json({
      success: false,
      error: "Storage is not configured.",
    });
  }

  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: key",
      });
    }

    await deleteFile(key);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete API error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    });
  }
}