"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Pencil, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectType = "repertoire" | "technique" | "theory" | "transcription" | "other";
type ProjectStatus = "not_started" | "in_progress" | "completed" | "on_hold";

interface LearningProject {
  _id: string;
  title: string;
  artist?: string;
  projectType: ProjectType;
  status: ProjectStatus;
  targetDate?: number;
  createdAt: number;
}

interface LearningProjectCardProps {
  project: LearningProject;
  onDelete?: (id: string) => void;
}

const typeLabels: Record<ProjectType, string> = {
  repertoire: "Repertoire",
  technique: "Technique",
  theory: "Theory",
  transcription: "Transcription",
  other: "Other",
};

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", className: "bg-yellow-100 text-yellow-700" },
};

export function LearningProjectCard({ project, onDelete }: LearningProjectCardProps) {
  const status = statusConfig[project.status];
  const targetDate = project.targetDate ? new Date(project.targetDate) : null;

  return (
    <Card className="group relative">
      <Link href={`/learning/${project._id}`} className="absolute inset-0 z-0" />
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {project.title}
          </CardTitle>
          {project.artist && (
            <CardDescription>{project.artist}</CardDescription>
          )}
        </div>
        <div className="relative z-10 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            asChild
          >
            <Link href={`/learning/${project._id}/edit`}>
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
                onDelete(project._id);
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
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
            {typeLabels[project.projectType]}
          </span>
          {targetDate && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {targetDate.toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
