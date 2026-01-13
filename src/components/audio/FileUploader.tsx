"use client";

import { useCallback, useState } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileAudio, FileText, File, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onUploadComplete?: (storageId: string, file: File, fileType: string) => void;
  onError?: (error: Error) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  className?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  storageId: string;
  fileType: string;
  status: "uploading" | "complete" | "error";
  progress?: number;
  error?: string;
}

const FILE_TYPE_ICONS = {
  audio: FileAudio,
  tab: FileText,
  chart: FileText,
  other: File,
};

export function FileUploader({
  onUploadComplete,
  onError,
  acceptedTypes = ["audio/*", ".gp", ".gp3", ".gp4", ".gp5", ".gpx", ".gp6", ".gp7", ".pdf"],
  maxFiles = 10,
  className,
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, isUploading, validateFile, getFileType } = useFileUpload({
    acceptedTypes,
    onSuccess: (storageId, file) => {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, storageId, status: "complete" as const }
            : f
        )
      );
      onUploadComplete?.(storageId, file, getFileType(file));
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files).slice(0, maxFiles - uploadedFiles.length);

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${file.name}`,
              file,
              storageId: "",
              fileType: getFileType(file),
              status: "error",
              error: validation.error,
            },
          ]);
          continue;
        }

        const fileType = getFileType(file);
        const fileEntry: UploadedFile = {
          id: `${Date.now()}-${file.name}`,
          file,
          storageId: "",
          fileType,
          status: "uploading",
          progress: 0,
        };

        setUploadedFiles((prev) => [...prev, fileEntry]);

        // Start upload
        const storageId = await upload(file);
        if (!storageId) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: "error" as const, error: "Upload failed" }
                : f
            )
          );
        }
      }
    },
    [maxFiles, uploadedFiles.length, validateFile, getFileType, upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            Drag and drop files here, or click to browse
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Audio files, tabs, and charts up to 100MB
          </p>
          <Button
            variant="outline"
            disabled={isUploading || uploadedFiles.length >= maxFiles}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = acceptedTypes.join(",");
              input.onchange = (e) => {
                handleFiles((e.target as HTMLInputElement).files);
              };
              input.click();
            }}
          >
            Select Files
          </Button>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => {
            const Icon = FILE_TYPE_ICONS[file.fileType as keyof typeof FILE_TYPE_ICONS] || File;

            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  file.status === "error" && "border-destructive bg-destructive/5"
                )}
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                    {file.status === "uploading" && file.progress !== undefined && (
                      <span className="ml-2">• {file.progress}%</span>
                    )}
                    {file.status === "error" && file.error && (
                      <span className="ml-2 text-destructive">• {file.error}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  {file.status === "complete" && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
