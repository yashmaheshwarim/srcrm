"use client";

import { useState, useCallback } from "react";
import type { UploadedFileInfo } from "@/components/FileUpload";

interface UseFileUploadOptions {
  onUploadComplete?: (files: UploadedFileInfo[]) => void;
  onUploadError?: (error: string) => void;
}

interface UseFileUploadReturn {
  /** Upload a single file programmatically */
  uploadFile: (file: File, compress?: boolean) => Promise<UploadedFileInfo>;
  /** Upload multiple files programmatically */
  uploadFiles: (files: File[], compress?: boolean) => Promise<UploadedFileInfo[]>;
  /** Delete a file by its storage key */
  deleteFile: (key: string) => Promise<boolean>;
  /** Currently uploading */
  isUploading: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Last error message */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
  /** List of successfully uploaded files */
  uploadedFiles: UploadedFileInfo[];
  /** Clear uploaded files list */
  clearUploaded: () => void;
}

/**
 * Hook for programmatic file upload and management.
 * Use this when you need to handle file uploads outside of the FileUpload component.
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  const clearError = useCallback(() => setError(null), []);
  const clearUploaded = useCallback(() => setUploadedFiles([]), []);

  const uploadSingleFile = useCallback(
    async (file: File, compress: boolean = true): Promise<UploadedFileInfo> => {
      const buffer = await file.arrayBuffer();
      // Convert ArrayBuffer to base64 using browser APIs
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          compress,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return result.data as UploadedFileInfo;
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, compress: boolean = true): Promise<UploadedFileInfo> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await uploadSingleFile(file, compress);
        setUploadedFiles((prev) => [...prev, result]);
        setProgress(100);
        options.onUploadComplete?.([result]);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        options.onUploadError?.(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadSingleFile, options],
  );

  const uploadFiles = useCallback(
    async (files: File[], compress: boolean = true): Promise<UploadedFileInfo[]> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const results: UploadedFileInfo[] = [];
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        try {
          const result = await uploadSingleFile(files[i], compress);
          results.push(result);
          setProgress(Math.round(((i + 1) / total) * 100));
        } catch (err) {
          const msg = err instanceof Error ? err.message : `Failed to upload ${files[i].name}`;
          setError(msg);
          options.onUploadError?.(msg);
          break;
        }
      }

      setUploadedFiles((prev) => [...prev, ...results]);
      setIsUploading(false);

      if (results.length > 0) {
        options.onUploadComplete?.(results);
      }

      return results;
    },
    [uploadSingleFile, options],
  );

  const deleteFile = useCallback(async (key: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/upload/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Delete failed");
      }

      setUploadedFiles((prev) => prev.filter((f) => f.key !== key));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      return false;
    }
  }, []);

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    isUploading,
    progress,
    error,
    clearError,
    uploadedFiles,
    clearUploaded,
  };
}