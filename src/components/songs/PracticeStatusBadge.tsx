"use client";

import { cn } from "@/lib/utils";

export type PracticeStatus = "new" | "learning" | "solid" | "performance_ready";

interface PracticeStatusBadgeProps {
  status: PracticeStatus;
  className?: string;
}

// Colorful pill styles - consistent with dropdown
const STATUS_CONFIG: Record<PracticeStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "border-gray-300 text-gray-600 bg-gray-50",
  },
  learning: {
    label: "Learning",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  solid: {
    label: "Solid",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  performance_ready: {
    label: "Ready",
    className: "bg-green-100 text-green-800 border-green-200",
  },
};

export function PracticeStatusBadge({ status, className }: PracticeStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export const PRACTICE_STATUS_OPTIONS: { value: PracticeStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "solid", label: "Solid" },
  { value: "performance_ready", label: "Ready" },
];
