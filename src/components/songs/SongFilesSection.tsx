"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  MoreVertical,
  Star,
  Link2,
  Play,
  Pause,
  Download,
  Pencil,
  Upload,
  ChevronDown,
  ChevronUp,
  Archive,
  FileAudio,
} from "lucide-react";
import { FileUploadDropzone, FileTypeIcon, FileUploadDropzoneRef, MetadataUpdateInfo } from "./FileUploadDropzone";
import { ExternalUrlDialog } from "./ExternalUrlDialog";
import { EditFileDialog } from "./EditFileDialog";
import { MetadataConfirmDialog } from "./MetadataConfirmDialog";
import { ArchivedFilesDialog } from "./ArchivedFilesDialog";
import { WaveformPlayer, type WaveformPlayerRef } from "@/components/audio";
import { formatFileSize } from "@/hooks/useFileUpload";
import { formatDuration } from "@/lib/audio";
import { toast } from "sonner";

interface SongFilesSectionProps {
  songId: Id<"songs">;
  compact?: boolean;
}

// File type display labels
const FILE_TYPE_LABELS: Record<string, string> = {
  audio: "Audio",
  video: "Video",
  chart: "Chart",
  tab: "Tab",
  gp: "Guitar Pro",
  stem: "Stem",
  other: "Other",
};

// External service display labels
const EXTERNAL_SERVICE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  dropbox: "Dropbox",
  google_drive: "Google Drive",
  bandcamp: "Bandcamp",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  other: "External Link",
};

// File type for edit dialog
interface EditableFile {
  _id: Id<"songFiles">;
  fileName?: string;
  variantLabel?: string;
  fileType: string;
}

export function SongFilesSection({ songId, compact = false }: SongFilesSectionProps) {
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFile, setEditingFile] = useState<EditableFile | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [expandedAudioId, setExpandedAudioId] = useState<Id<"songFiles"> | null>(null);
  const [playingFileId, setPlayingFileId] = useState<Id<"songFiles"> | null>(null);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataUpdate, setMetadataUpdate] = useState<MetadataUpdateInfo | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const dropzoneRef = useRef<FileUploadDropzoneRef>(null);
  const waveformRefs = useRef<Map<string, WaveformPlayerRef>>(new Map());
  const dragCounter = useRef(0); // Track nested drag events

  const files = useQuery(api.files.listBySong, { songId });
  const setPrimary = useMutation(api.files.setPrimary);
  const deleteFile = useMutation(api.files.softDelete);
  const applySongMetadata = useMutation(api.waveform.applySongMetadata);

  // Toggle audio player expansion (without auto-playing)
  const toggleAudioExpanded = useCallback((fileId: Id<"songFiles">) => {
    setExpandedAudioId((prev) => {
      // If collapsing, clear the playing state since WaveformPlayer will unmount
      if (prev === fileId) {
        setPlayingFileId(null);
        return null;
      }
      return fileId;
    });
  }, []);

  // Handle play button click - expand if needed and trigger play
  const handlePlayClick = useCallback((fileId: Id<"songFiles">, e: React.MouseEvent) => {
    e.stopPropagation();
    const waveformRef = waveformRefs.current.get(fileId);

    // If already expanded
    if (expandedAudioId === fileId) {
      // Toggle play/pause
      if (waveformRef?.isPlaying()) {
        waveformRef.pause();
      } else {
        waveformRef?.play();
      }
    } else {
      // Expand first, then play after a short delay for WaveSurfer to initialize
      setExpandedAudioId(fileId);
      setTimeout(() => {
        waveformRefs.current.get(fileId)?.play();
      }, 100);
    }
  }, [expandedAudioId]);

  // Handle play state changes from WaveformPlayer
  const handlePlayStateChange = useCallback((fileId: Id<"songFiles">, isPlaying: boolean) => {
    setPlayingFileId(isPlaying ? fileId : null);
  }, []);

  const isLoading = files === undefined;
  const hasFiles = files && files.length > 0;

  // Handle drag events on the entire card to show dropzone
  const handleCardDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleCardDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleCardDrop = useCallback(() => {
    // Reset drag state - the dropzone will handle the actual drop
    dragCounter.current = 0;
    setIsDraggingOver(false);
  }, []);

  const handleEditFile = (file: EditableFile) => {
    setEditingFile(file);
    setShowEditDialog(true);
  };

  // Force download by fetching blob - needed for cross-origin Convex storage URLs
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Failed to download file");
    }
  };

  const handleSetPrimary = async (fileId: Id<"songFiles">) => {
    try {
      const result = await setPrimary({ id: fileId });
      toast.success("Primary file updated");

      // Check if there's metadata to potentially update
      if (result.detected && (
        result.detected.durationSeconds !== undefined ||
        result.detected.tempo !== undefined ||
        result.detected.key !== undefined
      )) {
        if (result.songHasNoMetadata) {
          // Auto-apply detected metadata
          await applySongMetadata({
            songId: result.songId,
            durationSeconds: result.detected.durationSeconds,
            tempo: result.detected.tempo,
            key: result.detected.key,
          });
          toast.success("Song metadata updated from audio");
        } else if (result.hasConflict) {
          // Show confirmation dialog
          setMetadataUpdate(result);
          setShowMetadataDialog(true);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update primary file");
    }
  };

  const handleMetadataDetected = useCallback((info: MetadataUpdateInfo) => {
    setMetadataUpdate(info);
    setShowMetadataDialog(true);
  }, []);

  const handleArchive = async (fileId: Id<"songFiles">) => {
    try {
      const result = await deleteFile({ id: fileId });
      toast.success("File archived");

      // If a new primary was promoted, handle metadata update
      if (result.newPrimaryFileId && result.detected && (
        result.detected.durationSeconds !== undefined ||
        result.detected.tempo !== undefined ||
        result.detected.key !== undefined
      )) {
        if (result.songHasNoMetadata) {
          // Auto-apply detected metadata
          await applySongMetadata({
            songId: result.songId,
            durationSeconds: result.detected.durationSeconds,
            tempo: result.detected.tempo,
            key: result.detected.key,
          });
          toast.success("Song metadata updated from new primary");
        } else if (result.hasConflict) {
          // Show confirmation dialog
          setMetadataUpdate({
            songId: result.songId,
            hasConflict: result.hasConflict,
            songHasNoMetadata: result.songHasNoMetadata,
            detected: result.detected,
            current: result.current,
          });
          setShowMetadataDialog(true);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive file");
    }
  };

  const handleUploadSuccess = () => {
    toast.success("File uploaded successfully");
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  return (
    <Card
      className="relative"
      onDragEnter={handleCardDragEnter}
      onDragLeave={handleCardDragLeave}
      onDragOver={handleCardDragOver}
      onDrop={handleCardDrop}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-4 w-4" />
              Files
            </CardTitle>
            <CardDescription>
              Audio, video, charts, and tabs for this song
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dropzoneRef.current?.openFilePicker()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add File
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExternalDialog(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Add Link
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowArchiveDialog(true)}
              title="View archived files"
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-muted" />
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file) => {
              const isAudio = file.fileType === "audio" && file.storageId && file.url;
              const isExpanded = expandedAudioId === file._id;
              const isPlaying = playingFileId === file._id;
              // Determine clickable URL for non-audio files
              const clickableUrl = !isAudio ? (file.externalUrl || file.url) : null;

              return (
                <div key={file._id} className="rounded-lg border overflow-hidden">
                  {/* File row */}
                  <div
                    className={`flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                      isAudio ? "cursor-pointer" : ""
                    }`}
                    onClick={isAudio ? () => toggleAudioExpanded(file._id) : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Play button for audio, or file type icon for others */}
                      {isAudio ? (
                        <button
                          type="button"
                          className="flex-shrink-0 h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          onClick={(e) => handlePlayClick(file._id, e)}
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <div className="flex-shrink-0 h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <FileTypeIcon fileType={file.fileType} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {clickableUrl ? (
                            <a
                              href={clickableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium truncate hover:underline text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {file.fileName || file.variantLabel || `${FILE_TYPE_LABELS[file.fileType]} file`}
                            </a>
                          ) : (
                            <span className="font-medium truncate">
                              {file.fileName || file.variantLabel || `${FILE_TYPE_LABELS[file.fileType]} file`}
                            </span>
                          )}
                          {file.isPrimary && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{FILE_TYPE_LABELS[file.fileType] || file.fileType}</span>
                          {file.durationSeconds && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(file.durationSeconds)}</span>
                            </>
                          )}
                          {file.fileSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(file.fileSize)}</span>
                            </>
                          )}
                          {file.variantLabel && file.fileName && (
                            <>
                              <span>•</span>
                              <span>{file.variantLabel}</span>
                            </>
                          )}
                          {file.externalService && (
                            <>
                              <span>•</span>
                              <span>{EXTERNAL_SERVICE_LABELS[file.externalService] || file.externalService}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Quick actions */}
                      {file.url && (
                        <>
                          {isAudio ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleAudioExpanded(file._id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          ) : clickableUrl ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <a
                                href={clickableUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          {file.storageId && file.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(
                                file.url!,
                                file.fileName || `${FILE_TYPE_LABELS[file.fileType]}-file`
                              )}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {/* More options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditFile({
                              _id: file._id,
                              fileName: file.fileName,
                              variantLabel: file.variantLabel,
                              fileType: file.fileType,
                            })}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!file.isPrimary && (
                            <DropdownMenuItem
                              onClick={() => handleSetPrimary(file._id)}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleArchive(file._id)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Waveform player - shown when expanded */}
                  {isAudio && isExpanded && file.url && (
                    <div className="px-3 pb-3 border-t bg-muted/30">
                      <WaveformPlayer
                        ref={(ref) => {
                          if (ref) {
                            waveformRefs.current.set(file._id, ref);
                          } else {
                            waveformRefs.current.delete(file._id);
                          }
                        }}
                        audioUrl={file.url}
                        peaks={file.waveformPeaks}
                        onPlayStateChange={(playing) => handlePlayStateChange(file._id, playing)}
                        className="pt-3"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Upload dropzone - shown as overlay when dragging over files, normal when no files */}
        <FileUploadDropzone
          ref={dropzoneRef}
          songId={songId}
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
          visible={!hasFiles || isDraggingOver}
          asOverlay={hasFiles && isDraggingOver}
          onMetadataDetected={handleMetadataDetected}
        />

        {/* External URL dialog */}
        <ExternalUrlDialog
          open={showExternalDialog}
          onOpenChange={setShowExternalDialog}
          songId={songId}
          onSuccess={() => toast.success("Link added successfully")}
        />

        {/* Edit file dialog */}
        <EditFileDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          file={editingFile}
          onSuccess={() => toast.success("File updated")}
        />

        {/* Metadata confirmation dialog */}
        {metadataUpdate && (
          <MetadataConfirmDialog
            open={showMetadataDialog}
            onOpenChange={setShowMetadataDialog}
            songId={metadataUpdate.songId}
            detected={metadataUpdate.detected}
            current={metadataUpdate.current}
            onSuccess={() => toast.success("Song metadata updated")}
            onError={(error) => toast.error(error)}
          />
        )}

        {/* Archived files dialog */}
        <ArchivedFilesDialog
          open={showArchiveDialog}
          onOpenChange={setShowArchiveDialog}
          songId={songId}
          onMetadataDetected={handleMetadataDetected}
        />
      </CardContent>
    </Card>
  );
}
