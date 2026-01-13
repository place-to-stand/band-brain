"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SongForm } from "@/components/songs/SongForm";
import { ArrowLeft } from "lucide-react";

// TODO: Replace with actual Convex mutation once dev server is running
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NewSongPage({ params }: PageProps) {
  const { id: bandId } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use Convex mutation
  // const createSong = useMutation(api.songs.create);

  const handleSubmit = async (data: {
    title: string;
    artist: string;
    key: string;
    mode: string;
    tempo: number | undefined;
    timeSignature: string;
    duration: number | undefined;
    notes: string;
  }) => {
    setIsLoading(true);
    try {
      // TODO: Call createSong mutation
      // await createSong({
      //   bandId,
      //   title: data.title,
      //   artist: data.artist || undefined,
      //   key: data.key || undefined,
      //   mode: data.mode || undefined,
      //   tempo: data.tempo,
      //   timeSignature: data.timeSignature,
      //   duration: data.duration,
      //   notes: data.notes || undefined,
      // });
      console.log("Create song:", bandId, data);
      router.push(`/bands/${bandId}`);
    } catch (error) {
      console.error("Failed to create song:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/bands/${bandId}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/bands/${bandId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Song</h1>
          <p className="text-muted-foreground">Add a new song to the band repertoire</p>
        </div>
      </div>

      <SongForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
