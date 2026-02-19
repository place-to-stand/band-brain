"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, FileAudio, FileVideo, FileText, FileMusic } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { PracticeStatusBadge, PracticeStatus } from "./PracticeStatusBadge";

interface SongCardProps {
  song: {
    _id: Id<"songs">;
    bandId: Id<"bands">;
    title: string;
    key?: string;
    mode?: string;
    tempo?: number;
    timeSignature?: string;
    practiceStatus: string;
    fileCount: number;
    hasAudio: boolean;
    hasVideo: boolean;
    hasChart: boolean;
    hasTab: boolean;
  };
}

export function SongCard({ song }: SongCardProps) {
  return (
    <Link href={`/bands/${song.bandId}/songs/${song._id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">{song.title}</CardTitle>
            <PracticeStatusBadge
              status={song.practiceStatus as PracticeStatus}
            />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-2">
            {song.key && (
              <span className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                {song.key}
                {song.mode && ` ${song.mode}`}
              </span>
            )}
            {song.tempo && <span>{song.tempo} BPM</span>}
            {song.timeSignature && <span>{song.timeSignature}</span>}
            {!song.key && !song.tempo && !song.timeSignature && (
              <span className="text-muted-foreground">No details yet</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {song.fileCount > 0 ? (
              <>
                {song.hasAudio && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <FileAudio className="h-3 w-3" />
                    Audio
                  </Badge>
                )}
                {song.hasVideo && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <FileVideo className="h-3 w-3" />
                    Video
                  </Badge>
                )}
                {song.hasChart && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <FileMusic className="h-3 w-3" />
                    Chart
                  </Badge>
                )}
                {song.hasTab && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    Tab
                  </Badge>
                )}
                {!song.hasAudio && !song.hasVideo && !song.hasChart && !song.hasTab && song.fileCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {song.fileCount} {song.fileCount === 1 ? "file" : "files"}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No files</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
