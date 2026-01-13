"use client";

import { useState, useCallback } from "react";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type FileType = "audio" | "tab" | "chart" | "other";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseFileUploadOptions {
  onSuccess?: (storageId: string, file: File) => void;
  onError?: (error: Error) => void;
  acceptedTypes?: string[];
}

interface UseFileUploadReturn {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  reset: () => void;
  validateFile: (file: File) => { valid: boolean; error?: string };
  getFileType: (file: File) => FileType;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
        };
      }

      // Check file type if acceptedTypes is specified
      if (options.acceptedTypes && options.acceptedTypes.length > 0) {
        const isAccepted = options.acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.includes("*")) {
            const [category] = type.split("/");
            return file.type.startsWith(category + "/");
          }
          return file.type === type;
        });

        if (!isAccepted) {
          return {
            valid: false,
            error: `File type not accepted. Accepted types: ${options.acceptedTypes.join(", ")}`,
          };
        }
      }

      return { valid: true };
    },
    [options.acceptedTypes]
  );

  const getFileType = useCallback((file: File): FileType => {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Audio files
    if (mimeType.startsWith("audio/") ||
        [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"].some(ext => fileName.endsWith(ext))) {
      return "audio";
    }

    // Tab files (Guitar Pro, etc.)
    if ([".gp", ".gp3", ".gp4", ".gp5", ".gpx", ".gp6", ".gp7", ".ptb", ".tg"].some(ext =>
        fileName.endsWith(ext))) {
      return "tab";
    }

    // Chart files (lead sheets, chord charts)
    if ([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"].some(ext => fileName.endsWith(ext))) {
      return "chart";
    }

    return "other";
  }, []);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);
      setProgress(null);

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        options.onError?.(new Error(validation.error));
        return null;
      }

      setIsUploading(true);

      try {
        // TODO: Replace with actual Convex mutation
        // const uploadUrl = await generateUploadUrl();
        //
        // const response = await fetch(uploadUrl, {
        //   method: "POST",
        //   headers: { "Content-Type": file.type },
        //   body: file,
        // });
        //
        // if (!response.ok) {
        //   throw new Error("Upload failed");
        // }
        //
        // const { storageId } = await response.json();
        // options.onSuccess?.(storageId, file);
        // return storageId;

        // Simulate upload for now
        setProgress({ loaded: 0, total: file.size, percentage: 0 });

        await new Promise<void>((resolve) => {
          let loaded = 0;
          const interval = setInterval(() => {
            loaded += file.size / 10;
            if (loaded >= file.size) {
              loaded = file.size;
              clearInterval(interval);
              resolve();
            }
            setProgress({
              loaded,
              total: file.size,
              percentage: Math.round((loaded / file.size) * 100),
            });
          }, 100);
        });

        console.log("Upload file:", file.name, getFileType(file));
        const mockStorageId = `storage_${Date.now()}`;
        options.onSuccess?.(mockStorageId, file);
        return mockStorageId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error.message);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile, getFileType, options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
    validateFile,
    getFileType,
  };
}
