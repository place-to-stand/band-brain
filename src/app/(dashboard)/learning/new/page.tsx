"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LearningProjectForm } from "@/components/learning/LearningProjectForm";
import { ArrowLeft } from "lucide-react";

// TODO: Replace with actual Convex mutation once dev server is running
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

type ProjectType = "repertoire" | "technique" | "theory" | "transcription" | "other";

export default function NewLearningProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use Convex mutation
  // const createProject = useMutation(api.learningProjects.create);

  const handleSubmit = async (data: {
    title: string;
    artist: string;
    projectType: ProjectType;
    key: string;
    mode: string;
    tempo: number | undefined;
    timeSignature: string;
    notes: string;
    targetDate: string;
  }) => {
    setIsLoading(true);
    try {
      // TODO: Call createProject mutation
      // await createProject({
      //   title: data.title,
      //   artist: data.artist || undefined,
      //   projectType: data.projectType,
      //   key: data.key || undefined,
      //   mode: data.mode || undefined,
      //   tempo: data.tempo,
      //   timeSignature: data.timeSignature || undefined,
      //   notes: data.notes || undefined,
      //   targetDate: data.targetDate ? new Date(data.targetDate).getTime() : undefined,
      // });
      console.log("Create project:", data);
      router.push("/learning");
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/learning");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/learning">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Learning Project</h1>
          <p className="text-muted-foreground">
            Create a new personal learning project
          </p>
        </div>
      </div>

      <LearningProjectForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
