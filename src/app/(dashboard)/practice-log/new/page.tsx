"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PracticeSessionForm } from "@/components/practice/PracticeSessionForm";

// TODO: Replace with actual Convex mutation once dev server is running
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

export default function NewPracticeSessionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use Convex queries/mutations
  // const songs = useQuery(api.songs.listAll);
  // const learningProjects = useQuery(api.learningProjects.list);
  // const createSession = useMutation(api.practiceSessions.create);

  const songs: Array<{ _id: string; title: string; bandName?: string }> = [];
  const learningProjects: Array<{ _id: string; title: string }> = [];

  const handleSubmit = async (data: {
    songId?: string;
    learningProjectId?: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    notes: string;
    focusAreas: string[];
    rating?: number;
  }) => {
    setIsLoading(true);
    try {
      // TODO: Call createSession mutation
      // await createSession({
      //   songId: data.songId,
      //   learningProjectId: data.learningProjectId,
      //   startTime: data.startTime,
      //   duration: data.duration,
      //   notes: data.notes || undefined,
      //   focusAreas: data.focusAreas,
      //   rating: data.rating,
      // });
      console.log("Create practice session:", data);
      router.push("/practice-log");
    } catch (error) {
      console.error("Failed to create practice session:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/practice-log");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Log Practice Session</h1>
        <p className="text-muted-foreground">
          Record what you practiced and how it went.
        </p>
      </div>

      <PracticeSessionForm
        songs={songs}
        learningProjects={learningProjects}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
