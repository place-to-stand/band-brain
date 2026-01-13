"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LearningProjectCard } from "@/components/learning/LearningProjectCard";
import { Plus, BookOpen } from "lucide-react";

// TODO: Replace with actual Convex query once dev server is running
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

type ProjectType = "repertoire" | "technique" | "theory" | "transcription" | "other";
type ProjectStatus = "not_started" | "in_progress" | "completed" | "on_hold";

export default function LearningPage() {
  // TODO: Use Convex queries
  // const projects = useQuery(api.learningProjects.list);
  // const deleteProject = useMutation(api.learningProjects.softDelete);
  const projects: Array<{
    _id: string;
    title: string;
    artist?: string;
    projectType: ProjectType;
    status: ProjectStatus;
    targetDate?: number;
    createdAt: number;
  }> = [];

  const [, setIsDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    setIsDeleting(id);
    try {
      // TODO: Call deleteProject mutation
      // await deleteProject({ id });
      console.log("Delete project:", id);
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredProjects =
    filter === "all"
      ? projects
      : projects?.filter((p) => p.status === filter) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Projects</h1>
          <p className="text-muted-foreground">
            Track your personal learning goals and progress
          </p>
        </div>
        <Button asChild>
          <Link href="/learning/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "in_progress", "not_started", "completed", "on_hold"] as const).map(
          (status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === "all"
                ? "All"
                : status === "in_progress"
                ? "In Progress"
                : status === "not_started"
                ? "Not Started"
                : status === "completed"
                ? "Completed"
                : "On Hold"}
            </Button>
          )
        )}
      </div>

      {projects === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            {filter === "all" ? "No projects yet" : "No projects match this filter"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "all"
              ? "Create your first learning project to start tracking your progress."
              : "Try a different filter or create a new project."}
          </p>
          {filter === "all" && (
            <Button asChild className="mt-4">
              <Link href="/learning/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <LearningProjectCard
              key={project._id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
