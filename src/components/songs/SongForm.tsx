"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KEYS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const MODES = ["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8", "12/8"];

interface SongFormData {
  title: string;
  artist: string;
  key: string;
  mode: string;
  tempo: number | undefined;
  timeSignature: string;
  duration: number | undefined;
  notes: string;
}

interface SongFormProps {
  initialData?: Partial<SongFormData>;
  onSubmit: (data: SongFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SongForm({ initialData, onSubmit, onCancel, isLoading }: SongFormProps) {
  const [formData, setFormData] = useState<SongFormData>({
    title: initialData?.title || "",
    artist: initialData?.artist || "",
    key: initialData?.key || "",
    mode: initialData?.mode || "Major",
    tempo: initialData?.tempo,
    timeSignature: initialData?.timeSignature || "4/4",
    duration: initialData?.duration,
    notes: initialData?.notes || "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Song title is required");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Song Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter song title"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="artist">Artist / Composer</Label>
          <Input
            id="artist"
            value={formData.artist}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, artist: e.target.value }))
            }
            placeholder="Original artist or composer"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="key">Key</Label>
          <select
            id="key"
            value={formData.key}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, key: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isLoading}
          >
            <option value="">Select key...</option>
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode">Mode</Label>
          <select
            id="mode"
            value={formData.mode}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, mode: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isLoading}
          >
            {MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tempo">Tempo (BPM)</Label>
          <Input
            id="tempo"
            type="number"
            min="20"
            max="300"
            value={formData.tempo || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                tempo: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            placeholder="120"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeSignature">Time Signature</Label>
          <select
            id="timeSignature"
            value={formData.timeSignature}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, timeSignature: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isLoading}
          >
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            min="0"
            value={formData.duration || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                duration: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            placeholder="180"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Any additional notes about this song..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData?.title ? "Update Song" : "Create Song"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
