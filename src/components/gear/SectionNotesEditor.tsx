"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

interface SectionNotesEditorProps {
  value: string;
  onSave: (notes: string) => void;
  onCollapse: () => void;
  autoFocus?: boolean;
}

/**
 * Section notes editor with local state to prevent controlled input glitches.
 * Debounces saves and collapses on blur if empty.
 */
export function SectionNotesEditor({
  value,
  onSave,
  onCollapse,
  autoFocus = false,
}: SectionNotesEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value when it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    // Debounce save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSave(newValue);
    }, 500);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onSave(localValue);

    // Collapse if empty
    if (!localValue.trim()) {
      onCollapse();
    }
  };

  return (
    <Textarea
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="Section notes..."
      className="min-h-[50px] text-xs resize-none"
      autoFocus={autoFocus}
    />
  );
}
