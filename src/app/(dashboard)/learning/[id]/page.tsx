"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, BookOpen, Calendar, Upload, FileAudio, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with actual Convex queries once dev server is running
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

type ProjectType = "repertoire" | "technique" | "theory" | "transcription" | "other";
type ProjectStatus = "not_started" | "in_progress" | "completed" | "on_hold";

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

export default function LearningProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);

  // TODO: Use Convex queries
  // const project = useQuery(api.learningProjects.getById, { id });
  // const files = useQuery(api.files.listByLearningProject, { learningProjectId: id });

  // Placeholder - will be replaced with Convex query
  const project = undefined as {
    _id: string;
    title: string;
    artist?: string;
    projectType: ProjectType;
    status: ProjectStatus;
    key?: string;
    mode?: string;
    tempo?: number;
    timeSignature?: string;
    notes?: string;
    targetDate?: number;
    createdAt: number;
  } | undefined | null;

  const files: Array<{
    _id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> = [];

  if (project === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/learning">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Project Not Found</h1>
          <p className="text-muted-foreground">
            This project may have been deleted or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status];
  const targetDate = project.targetDate ? new Date(project.targetDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/learning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  status.className
                )}
              >
                {status.label}
              </span>
            </div>
            {project.artist && (
              <p className="text-lg text-muted-foreground">{project.artist}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/learning/${id}/edit`}>
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
              <BookOpen className="h-5 w-5" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-lg">{typeLabels[project.projectType]}</p>
              </div>
              {project.key && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Key</p>
                  <p className="text-lg">
                    {project.key} {project.mode}
                  </p>
                </div>
              )}
              {project.tempo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo</p>
                  <p className="text-lg">{project.tempo} BPM</p>
                </div>
              )}
              {project.timeSignature && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Time Signature
                  </p>
                  <p className="text-lg">{project.timeSignature}</p>
                </div>
              )}
              {targetDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Target Date
                  </p>
                  <p className="flex items-center gap-1 text-lg">
                    <Calendar className="h-4 w-4" />
                    {targetDate.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {project.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{project.notes}</p>
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
                Audio files, tabs, and reference materials
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
                No files uploaded yet. Add reference audio, tabs, or other materials.
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
