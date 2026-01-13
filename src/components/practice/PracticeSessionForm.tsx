"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Star } from "lucide-react";

interface PracticeSessionFormData {
  songId?: string;
  learningProjectId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  notes: string;
  focusAreas: string[];
  rating?: number;
}

interface PracticeSessionFormProps {
  initialData?: Partial<PracticeSessionFormData>;
  songs?: Array<{ _id: string; title: string; bandName?: string }>;
  learningProjects?: Array<{ _id: string; title: string }>;
  onSubmit: (data: PracticeSessionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const FOCUS_AREAS = [
  "Timing",
  "Technique",
  "Dynamics",
  "Tone",
  "Memorization",
  "Sight Reading",
  "Improvisation",
  "Speed",
  "Accuracy",
  "Expression",
];

export function PracticeSessionForm({
  initialData,
  songs = [],
  learningProjects = [],
  onSubmit,
  onCancel,
  isLoading,
}: PracticeSessionFormProps) {
  const [formData, setFormData] = useState<PracticeSessionFormData>(() => ({
    songId: initialData?.songId,
    learningProjectId: initialData?.learningProjectId,
    startTime: initialData?.startTime ?? Date.now(),
    endTime: initialData?.endTime,
    duration: initialData?.duration,
    notes: initialData?.notes || "",
    focusAreas: initialData?.focusAreas || [],
    rating: initialData?.rating,
  }));
  const [error, setError] = useState<string | null>(null);
  const [practiceType, setPracticeType] = useState<"song" | "project">(
    initialData?.learningProjectId ? "project" : "song"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.songId && !formData.learningProjectId) {
      setError("Please select a song or learning project");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const toggleFocusArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((a) => a !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What did you practice?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={practiceType === "song" ? "default" : "outline"}
              onClick={() => {
                setPracticeType("song");
                setFormData((prev) => ({ ...prev, learningProjectId: undefined }));
              }}
              disabled={isLoading}
            >
              Band Song
            </Button>
            <Button
              type="button"
              variant={practiceType === "project" ? "default" : "outline"}
              onClick={() => {
                setPracticeType("project");
                setFormData((prev) => ({ ...prev, songId: undefined }));
              }}
              disabled={isLoading}
            >
              Learning Project
            </Button>
          </div>

          {practiceType === "song" ? (
            <div className="space-y-2">
              <Label htmlFor="songId">Select Song</Label>
              <select
                id="songId"
                value={formData.songId || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, songId: e.target.value || undefined }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isLoading}
              >
                <option value="">Select a song...</option>
                {songs.map((song) => (
                  <option key={song._id} value={song._id}>
                    {song.title} {song.bandName ? `(${song.bandName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="projectId">Select Learning Project</Label>
              <select
                id="projectId"
                value={formData.learningProjectId || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    learningProjectId: e.target.value || undefined,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isLoading}
              >
                <option value="">Select a project...</option>
                {learningProjects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Practice Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="480"
              value={formData.duration || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  duration: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              placeholder="30"
              disabled={isLoading}
            />
            {formData.duration && (
              <p className="text-sm text-muted-foreground">
                {formatDuration(formData.duration)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Focus Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <Button
                key={area}
                type="button"
                variant={formData.focusAreas.includes(area) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFocusArea(area)}
                disabled={isLoading}
              >
                {area}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Session Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                type="button"
                variant={formData.rating === rating ? "default" : "outline"}
                size="icon"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    rating: prev.rating === rating ? undefined : rating,
                  }))
                }
                disabled={isLoading}
              >
                {rating}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Rate how productive this session was (1-5)
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="What did you work on? Any breakthroughs or challenges?"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData?.startTime ? "Update Session" : "Log Session"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
