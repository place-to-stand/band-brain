"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Clock, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PracticeStatus = "not_started" | "learning" | "refining" | "performance_ready";

interface Song {
  _id: string;
  bandId: string;
  title: string;
  artist?: string;
  key?: string;
  mode?: string;
  tempo?: number;
  timeSignature?: string;
  duration?: number;
  practiceStatus: PracticeStatus;
}

interface SongCardProps {
  song: Song;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<PracticeStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700" },
  learning: { label: "Learning", className: "bg-yellow-100 text-yellow-700" },
  refining: { label: "Refining", className: "bg-blue-100 text-blue-700" },
  performance_ready: { label: "Performance Ready", className: "bg-green-100 text-green-700" },
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SongCard({ song, onDelete }: SongCardProps) {
  const status = statusConfig[song.practiceStatus];

  return (
    <Card className="group relative">
      <Link
        href={`/bands/${song.bandId}/songs/${song._id}`}
        className="absolute inset-0 z-0"
      />
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {song.title}
          </CardTitle>
          {song.artist && (
            <CardDescription>{song.artist}</CardDescription>
          )}
        </div>
        <div className="relative z-10 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            asChild
          >
            <Link href={`/bands/${song.bandId}/songs/${song._id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete(song._id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              status.className
            )}
          >
            {status.label}
          </span>
          {song.key && (
            <span className="text-muted-foreground">
              {song.key} {song.mode}
            </span>
          )}
          {song.tempo && (
            <span className="text-muted-foreground">{song.tempo} BPM</span>
          )}
          {song.duration && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(song.duration)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
