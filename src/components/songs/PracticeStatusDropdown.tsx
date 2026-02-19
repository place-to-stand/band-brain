"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type PracticeStatus = "new" | "learning" | "solid" | "performance_ready";

interface PracticeStatusDropdownProps {
  status: PracticeStatus;
  onStatusChange: (status: PracticeStatus) => void;
  disabled?: boolean;
}

// Colorful pill styles - same as PracticeStatusBadge
const STATUS_CONFIG: Record<PracticeStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100",
  },
  learning: {
    label: "Learning",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  },
  solid: {
    label: "Solid",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  },
  performance_ready: {
    label: "Ready",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  },
};

const STATUSES: PracticeStatus[] = ["new", "learning", "solid", "performance_ready"];

export function PracticeStatusDropdown({
  status,
  onStatusChange,
  disabled,
}: PracticeStatusDropdownProps) {
  const config = STATUS_CONFIG[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            config.className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {config.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUSES.map((s) => {
          const itemConfig = STATUS_CONFIG[s];
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onStatusChange(s)}
              className="cursor-pointer"
            >
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mr-2",
                  itemConfig.className
                )}
              >
                {itemConfig.label}
              </span>
              {s === status && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
