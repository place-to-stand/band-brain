"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Users, Music, Plus } from "lucide-react";

// TODO: Replace with actual Convex queries once dev server is running
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BandDetailPage({ params }: PageProps) {
  const { id } = use(params);

  // TODO: Use Convex queries
  // const band = useQuery(api.bands.getById, { id });
  // const songs = useQuery(api.songs.listByBand, { bandId: id });

  // Placeholder - will be replaced with Convex query
  const band = undefined as {
    _id: string;
    name: string;
    description?: string;
    members: Array<{ name: string; instruments: string[] }>;
    createdAt: number;
  } | undefined | null;

  const songs: Array<{
    _id: string;
    title: string;
    artist?: string;
    practiceStatus: string;
  }> = [];

  if (band === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/bands">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bands
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Band Not Found</h1>
          <p className="text-muted-foreground">
            This band may have been deleted or does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bands">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{band.name}</h1>
            {band.description && (
              <p className="text-muted-foreground">{band.description}</p>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/bands/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Band
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>
              {band.members.length} {band.members.length === 1 ? "member" : "members"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {band.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No members added yet. Edit the band to add members.
              </p>
            ) : (
              <div className="space-y-3">
                {band.members.map((member, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.instruments.length > 0
                        ? member.instruments.join(", ")
                        : "No instruments"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Songs
              </CardTitle>
              <CardDescription>
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/bands/${id}/songs/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Song
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {songs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No songs added yet. Add your first song to start practicing.
              </p>
            ) : (
              <div className="space-y-2">
                {songs.map((song) => (
                  <Link
                    key={song._id}
                    href={`/bands/${id}/songs/${song._id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <p className="font-medium">{song.title}</p>
                    {song.artist && (
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
