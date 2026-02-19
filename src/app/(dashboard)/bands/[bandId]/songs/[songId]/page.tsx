"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SongFilesSection,
  PracticeStatusDropdown,
  PracticeStatus,
} from "@/components/songs";
import { SectionGearManager } from "@/components/gear";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const MUSICAL_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
] as const;

const MODES = [
  "Major", "Minor", "Dorian", "Phrygian",
  "Lydian", "Mixolydian", "Aeolian", "Locrian",
] as const;

const TIME_SIGNATURES = [
  "4/4", "3/4", "6/8", "2/4", "5/4", "7/8", "12/8",
] as const;

// Inline editable text component - no visual shift between modes
function InlineEditableText({
  value,
  onSave,
  placeholder,
  className,
  inputClassName,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (localValue.trim() !== value) {
      onSave(localValue.trim());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setLocalValue(value);
            setIsEditing(false);
          }
        }}
        className={cn(
          "h-auto py-0 px-1 bg-transparent border-transparent focus:border-input",
          "font-inherit text-inherit leading-inherit",
          inputClassName
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors inline-block",
        !value && "text-muted-foreground italic",
        className
      )}
    >
      {value || placeholder}
    </span>
  );
}

// Inline select component - fixed width container for consistent sizing
const CLEAR_VALUE = "__none__";

function InlineSelect({
  value,
  onSave,
  options,
  placeholder,
  width = "w-16",
}: {
  value: string | undefined;
  onSave: (value: string | undefined) => void;
  options: readonly string[];
  placeholder: string;
  width?: string;
}) {
  return (
    <div className={width}>
      <Select
        value={value || CLEAR_VALUE}
        onValueChange={(v) => onSave(v === CLEAR_VALUE ? undefined : v)}
      >
        <SelectTrigger className="h-7 w-full border-0 bg-transparent hover:bg-muted/50 focus:ring-0 px-2">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={width}>
          <SelectItem value={CLEAR_VALUE}>—</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as Id<"bands">;
  const songId = params.songId as Id<"songs">;

  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // General notes state (managed separately for debounced saves)
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const song = useQuery(api.songs.get, { id: songId });
  const updateSong = useMutation(api.songs.update);
  const updatePracticeStatus = useMutation(api.songs.updatePracticeStatus);
  const archiveSong = useMutation(api.songs.softDelete);

  const isLoading = song === undefined;

  // Sync local notes with server when song loads
  useEffect(() => {
    if (song && localNotes === null) {
      setLocalNotes(song.notes || "");
    }
  }, [song, localNotes]);

  // Handle field updates with debounce for text fields
  const handleFieldUpdate = useCallback(
    async (field: string, value: string | number | undefined) => {
      try {
        await updateSong({
          id: songId,
          [field]: value,
        });
      } catch (err) {
        toast.error(`Failed to update ${field}`);
        console.error(err);
      }
    },
    [songId, updateSong]
  );

  // Handle general notes change with debounced save
  const handleGeneralNotesChange = useCallback(
    (notes: string) => {
      setLocalNotes(notes);

      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }

      notesTimeoutRef.current = setTimeout(async () => {
        try {
          await updateSong({
            id: songId,
            notes: notes.trim(),
          });
        } catch (err) {
          console.error("Failed to save notes:", err);
        }
      }, 1000);
    },
    [songId, updateSong]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveSong({ id: songId });
      toast.success("Song archived");
      router.push(`/bands/${bandId}/songs`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive song");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleStatusChange = async (newStatus: PracticeStatus) => {
    try {
      await updatePracticeStatus({ id: songId, practiceStatus: newStatus });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Song not found
  if (song === null) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Song not found</p>
        <Button variant="outline" onClick={() => router.push(`/bands/${bandId}/songs`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Songs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Title, Status, Key Info */}
      <div className="space-y-3">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/bands/${bandId}/songs`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchiveDialog(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          {isLoading ? (
            <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">
              <InlineEditableText
                value={song?.title || ""}
                onSave={(value) => handleFieldUpdate("title", value)}
                placeholder="Song title"
                inputClassName="text-3xl font-bold"
              />
            </h1>
          )}
          {!isLoading && song && (
            <PracticeStatusDropdown
              status={song.practiceStatus as PracticeStatus}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>

        {/* Musical info bar - inline editable */}
        {!isLoading && song && (
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Key:</span>
              <InlineSelect
                value={song.key}
                onSave={(v) => handleFieldUpdate("key", v)}
                options={MUSICAL_KEYS}
                placeholder="—"
                width="w-14"
              />
              <InlineSelect
                value={song.mode}
                onSave={(v) => handleFieldUpdate("mode", v)}
                options={MODES}
                placeholder="mode"
                width="w-24"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Tempo:</span>
              <InlineEditableText
                value={song.tempo?.toString() || ""}
                onSave={(v) => {
                  const num = parseInt(v, 10);
                  handleFieldUpdate("tempo", isNaN(num) ? undefined : num);
                }}
                placeholder="—"
                className="w-10 text-center tabular-nums"
                inputClassName="w-10 text-center tabular-nums"
              />
              <span className="text-muted-foreground">BPM</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Time:</span>
              <InlineSelect
                value={song.timeSignature}
                onSave={(v) => handleFieldUpdate("timeSignature", v)}
                options={TIME_SIGNATURES}
                placeholder="—"
                width="w-16"
              />
            </div>
            {song.durationSeconds && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>
                  {Math.floor(song.durationSeconds / 60)}:{String(song.durationSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Notes and Files - Side by side */}
      {!isLoading && song && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Performance Notes */}
          <SectionGearManager
            songId={songId}
            generalNotes={localNotes ?? song.notes ?? ""}
            onGeneralNotesChange={handleGeneralNotesChange}
          />

          {/* Files */}
          <SongFilesSection songId={songId} />
        </div>
      )}

      {/* Archive confirmation dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Song</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{song?.title}&quot;? The
              song and its files will be moved to the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
