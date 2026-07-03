"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export interface UploadedFileInfo {
  key: string;
  url: string;
  size: number;
  contentType: string;
  originalName: string;
  compressed: boolean;
}

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFileInfo[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  compress?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  maxSizeMB = 50,
  accept = "*/*",
  compress = true,
  className = "",
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      setError(null);

      // Validate number of files
      if (files.length + selectedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate file sizes
      const maxBytes = maxSizeMB * 1024 * 1024;
      const oversized = selectedFiles.find((f) => f.size > maxBytes);
      if (oversized) {
        setError(`File "${oversized.name}" exceeds ${maxSizeMB}MB limit`);
        return;
      }

      setFiles((prev) => [...prev, ...selectedFiles]);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files.length, maxFiles, maxSizeMB],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeUploaded = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const uploaded: UploadedFileInfo[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Read file as base64 using browser APIs
        const buffer = await file.arrayBuffer();
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

        uploaded.push(result.data);
        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Failed to upload ${file.name}`;
        setError(msg);
        onUploadError?.(msg);
        break;
      }
    }

    setUploadedFiles((prev) => [...prev, ...uploaded]);
    setFiles([]);
    setUploading(false);
    setProgress(100);

    if (uploaded.length > 0) {
      onUploadComplete?.(uploaded);
    }
  }, [files, compress, onUploadComplete, onUploadError]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop zone / file selector */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || uploading
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
        }`}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          if (disabled || uploading) return;
          e.preventDefault();
          e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
        }}
        onDrop={(e) => {
          if (disabled || uploading) return;
          e.preventDefault();
          e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
          const droppedFiles = Array.from(e.dataTransfer.files);
          if (droppedFiles.length > 0) {
            setError(null);
            if (files.length + droppedFiles.length > maxFiles) {
              setError(`Maximum ${maxFiles} files allowed`);
              return;
            }
            const maxBytes = maxSizeMB * 1024 * 1024;
            const oversized = droppedFiles.find((f) => f.size > maxBytes);
            if (oversized) {
              setError(`File "${oversized.name}" exceeds ${maxSizeMB}MB limit`);
              return;
            }
            setFiles((prev) => [...prev, ...droppedFiles]);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Up to {maxFiles} files, max {maxSizeMB}MB each
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected files list (pending upload) */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Files to upload ({files.length})
          </h4>
          {files.map((file, index) => (
            <div
              key={`pending-${index}`}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(index)}
                disabled={uploading}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading... {progress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {files.length} file{files.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Uploaded files ({uploadedFiles.length})
          </h4>
          {uploadedFiles.map((file, index) => (
            <div
              key={`uploaded-${index}`}
              className="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded-lg"
            >
              {getFileIcon(file.contentType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{file.originalName}</p>
                <p className="text-xs text-gray-400">
                  {formatSize(file.size)}
                  {file.compressed && (
                    <span className="text-green-600 ml-2">(compressed)</span>
                  )}
                </p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View
              </a>
              <button
                onClick={() => removeUploaded(index)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}