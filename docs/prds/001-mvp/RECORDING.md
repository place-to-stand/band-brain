# Recording Projects

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md) | [FILES.md](./FILES.md)

## Overview

Recording projects help track the progress of recording sessions:
- **Project** → Contains multiple songs being recorded
- **Tracking Grid** → Matrix of instruments × songs with status
- **Bounces** → Mix versions with waveform and timestamped comments

---

## Data Model

### Recording Project
```typescript
{
  userId: Id<"users">,
  bandId?: Id<"bands">,
  name: string,
  status: 'pre_production' | 'tracking' | 'mixing' | 'mastering' | 'complete',
  notes?: string,
}
```

### Recording Song
```typescript
{
  projectId: Id<"recordingProjects">,
  title: string,
  sourceSongId?: Id<"songs">, // Link to band song if applicable
  mixNotes?: string,
  position: number,
}
```

### Tracking Grid
```typescript
{
  recordingSongId: Id<"recordingSongs">,
  instrument: string,
  status: 'not_started' | 'in_progress' | 'needs_redo' | 'complete',
  performer?: string,
  notes?: string,
}
```

### Bounce
```typescript
{
  recordingSongId: Id<"recordingSongs">,
  versionLabel: string, // e.g., "Mix v3", "Rough 1"
  storageId: Id<"_storage">,
  fileName?: string,
  fileSize: number,
  waveformPeaks?: number[],
}
```

### Bounce Comment
```typescript
{
  bounceId: Id<"bounces">,
  userId: Id<"users">,
  timestampSeconds?: number, // Click position on waveform
  content: string,
}
```

---

## Tracking Grid Component

```typescript
// components/recording/TrackingGrid.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface TrackingGridProps {
  projectId: string;
}

const STATUS_COLORS = {
  not_started: "bg-gray-200",
  in_progress: "bg-yellow-200",
  needs_redo: "bg-red-200",
  complete: "bg-green-200",
};

const STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  needs_redo: "Needs Redo",
  complete: "Complete",
};

export function TrackingGrid({ projectId }: TrackingGridProps) {
  const songs = useQuery(api.recordingProjects.getSongs, { projectId });
  const updateStatus = useMutation(api.recordingProjects.updateTrackingStatus);

  // Get unique instruments across all songs
  const instruments = [...new Set(
    songs?.flatMap(s => s.trackingGrid.map(t => t.instrument)) || []
  )];

  const handleStatusClick = async (
    recordingSongId: string,
    instrument: string,
    currentStatus: string
  ) => {
    const statuses = ["not_started", "in_progress", "needs_redo", "complete"];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    await updateStatus({
      recordingSongId,
      instrument,
      status: statuses[nextIndex],
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-muted">Song</th>
            {instruments.map((inst) => (
              <th key={inst} className="border p-2 bg-muted capitalize">
                {inst}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {songs?.map((song) => (
            <tr key={song._id}>
              <td className="border p-2 font-medium">{song.title}</td>
              {instruments.map((inst) => {
                const track = song.trackingGrid.find(t => t.instrument === inst);
                const status = track?.status || "not_started";
                return (
                  <td
                    key={inst}
                    className={`border p-2 cursor-pointer ${STATUS_COLORS[status]}`}
                    onClick={() => handleStatusClick(song._id, inst, status)}
                    title={STATUS_LABELS[status]}
                  >
                    {status === "complete" ? "✓" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Bounce Player with Comments

```typescript
// components/recording/BouncePlayer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface BouncePlayerProps {
  bounceId: string;
  audioUrl: string;
  waveformPeaks?: number[];
}

export function BouncePlayer({ bounceId, audioUrl, waveformPeaks }: BouncePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [newComment, setNewComment] = useState("");

  const comments = useQuery(api.bounces.getComments, { bounceId });
  const addComment = useMutation(api.bounces.addComment);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4a5568",
      progressColor: "#3182ce",
      cursorColor: "#e53e3e",
      height: 80,
      // Use pre-computed peaks if available
      peaks: waveformPeaks ? [waveformPeaks] : undefined,
    });

    wavesurferRef.current.load(audioUrl);

    wavesurferRef.current.on("audioprocess", () => {
      setCurrentTime(wavesurferRef.current?.getCurrentTime() || 0);
    });

    wavesurferRef.current.on("play", () => setIsPlaying(true));
    wavesurferRef.current.on("pause", () => setIsPlaying(false));

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [audioUrl, waveformPeaks]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment({
      bounceId,
      content: newComment,
      timestampSeconds: currentTime,
    });
    setNewComment("");
  };

  const jumpToComment = (timestampSeconds: number) => {
    wavesurferRef.current?.seekTo(timestampSeconds / wavesurferRef.current.getDuration());
  };

  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div ref={containerRef} className="w-full" />

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => wavesurferRef.current?.playPause()}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="font-mono">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Add comment */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Add comment at ${formatTime(currentTime)}...`}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleAddComment}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Add
        </button>
      </div>

      {/* Comments list */}
      <div className="space-y-2">
        {comments?.map((comment) => (
          <div
            key={comment._id}
            className="flex items-start gap-2 p-2 bg-muted rounded cursor-pointer"
            onClick={() => comment.timestampSeconds && jumpToComment(comment.timestampSeconds)}
          >
            {comment.timestampSeconds && (
              <span className="font-mono text-xs bg-primary/20 px-1 rounded">
                {formatTime(comment.timestampSeconds)}
              </span>
            )}
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
```

---

## Project Status Flow

```
pre_production → tracking → mixing → mastering → complete
```

- **Pre-production:** Planning, scratch demos
- **Tracking:** Recording instruments
- **Mixing:** Balancing, effects, bouncing
- **Mastering:** Final polish
- **Complete:** Done!

---

## Convex Functions

```typescript
// convex/recordingProjects.ts

export const create = mutation({
  args: {
    name: v.string(),
    bandId: v.optional(v.id("bands")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("recordingProjects", {
      userId: identity.subject as any,
      bandId: args.bandId,
      name: args.name,
      status: "pre_production",
      createdAt: Date.now(),
    });
  },
});

export const addSong = mutation({
  args: {
    projectId: v.id("recordingProjects"),
    title: v.string(),
    sourceSongId: v.optional(v.id("songs")),
  },
  handler: async (ctx, args) => {
    const existingSongs = await ctx.db
      .query("recordingSongs")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();

    return await ctx.db.insert("recordingSongs", {
      projectId: args.projectId,
      title: args.title,
      sourceSongId: args.sourceSongId,
      position: existingSongs.length,
      createdAt: Date.now(),
    });
  },
});

export const updateTrackingStatus = mutation({
  args: {
    recordingSongId: v.id("recordingSongs"),
    instrument: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trackingGrid")
      .withIndex("by_song", q => q.eq("recordingSongId", args.recordingSongId))
      .filter(q => q.eq(q.field("instrument"), args.instrument))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("trackingGrid", {
        recordingSongId: args.recordingSongId,
        instrument: args.instrument,
        status: args.status,
      });
    }
  },
});
```
