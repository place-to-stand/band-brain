"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Music, Clock, Upload, FileAudio, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with actual Convex queries once dev server is running
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PageProps {
  params: Promise<{ id: string; songId: string }>;
}

type PracticeStatus = "not_started" | "learning" | "refining" | "performance_ready";

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

export default function SongDetailPage({ params }: PageProps) {
  const { id: bandId, songId } = use(params);

  // TODO: Use Convex queries
  // const song = useQuery(api.songs.getById, { id: songId });
  // const files = useQuery(api.files.listBySong, { songId });

  // Placeholder - will be replaced with Convex query
  const song = undefined as {
    _id: string;
    bandId: string;
    title: string;
    artist?: string;
    key?: string;
    mode?: string;
    tempo?: number;
    timeSignature?: string;
    duration?: number;
    notes?: string;
    practiceStatus: PracticeStatus;
  } | undefined | null;

  const files: Array<{
    _id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> = [];

  if (song === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/bands/${bandId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Band
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Song Not Found</h1>
          <p className="text-muted-foreground">
            This song may have been deleted or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const status = statusConfig[song.practiceStatus];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/bands/${bandId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{song.title}</h1>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  status.className
                )}
              >
                {status.label}
              </span>
            </div>
            {song.artist && (
              <p className="text-lg text-muted-foreground">{song.artist}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/bands/${bandId}/songs/${songId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Practice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Song Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {song.key && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Key</p>
                  <p className="text-lg">
                    {song.key} {song.mode}
                  </p>
                </div>
              )}
              {song.tempo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo</p>
                  <p className="text-lg">{song.tempo} BPM</p>
                </div>
              )}
              {song.timeSignature && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Time Signature
                  </p>
                  <p className="text-lg">{song.timeSignature}</p>
                </div>
              )}
              {song.duration && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="flex items-center gap-1 text-lg">
                    <Clock className="h-4 w-4" />
                    {formatDuration(song.duration)}
                  </p>
                </div>
              )}
            </div>
            {song.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{song.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Files
              </CardTitle>
              <CardDescription>
                Audio files, tabs, and charts
              </CardDescription>
            </div>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No files uploaded yet. Add audio files, tabs, or charts to practice with.
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
