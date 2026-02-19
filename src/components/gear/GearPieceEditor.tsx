"use client";

import { useState, useRef, useEffect } from "react";
import { KnobDial } from "./KnobDial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CircleDot,
} from "lucide-react";

// Type definitions matching schema
interface Knob {
  label: string;
  position: number; // 0-1
}

export interface GearPiece {
  name: string;
  type: string; // 'pedal' | 'synth' | 'amp' | 'other'
  enabled: boolean;
  knobs: Knob[];
  patch?: string;
  patchName?: string;
  isOverride?: boolean;
  notes?: string;
}

interface GearPieceEditorProps {
  gear: GearPiece;
  gearIndex: number;
  totalGear: number;
  onChange: (gear: GearPiece) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const GEAR_TYPE_ICONS: Record<string, string> = {
  pedal: "🎸",
  synth: "🎹",
  amp: "📻",
  other: "🎛️",
};

export function GearPieceEditor({
  gear,
  gearIndex,
  totalGear,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: GearPieceEditorProps) {
  // Notes visibility: show if user opened it manually
  const [notesUserOpened, setNotesUserOpened] = useState(false);
  const [editingKnobIndex, setEditingKnobIndex] = useState<number | null>(null);
  const [editingKnobLabel, setEditingKnobLabel] = useState("");
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show notes if content exists OR user manually opened
  const effectiveNotesOpen = !!gear.notes || notesUserOpened;

  // Handle notes blur - save and potentially close
  const handleNotesBlur = (value: string) => {
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    onChange({ ...gear, notes: value });

    if (!value.trim()) {
      setNotesUserOpened(false);
    }
  };

  // Debounced save while typing
  const handleNotesChange = (value: string) => {
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      onChange({ ...gear, notes: value });
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  const handleKnobChange = (index: number, position: number) => {
    const newKnobs = [...gear.knobs];
    newKnobs[index] = { ...newKnobs[index], position };
    onChange({ ...gear, knobs: newKnobs });
  };

  const handleAddKnob = () => {
    onChange({
      ...gear,
      knobs: [...gear.knobs, { label: "Knob", position: 0.5 }],
    });
  };

  const handleRemoveKnob = (index: number) => {
    const newKnobs = gear.knobs.filter((_, i) => i !== index);
    onChange({ ...gear, knobs: newKnobs });
  };

  const startEditingKnobLabel = (index: number) => {
    setEditingKnobIndex(index);
    setEditingKnobLabel(gear.knobs[index].label);
  };

  const saveKnobLabel = () => {
    if (editingKnobIndex === null) return;
    const newKnobs = [...gear.knobs];
    newKnobs[editingKnobIndex] = {
      ...newKnobs[editingKnobIndex],
      label: editingKnobLabel.trim() || "Knob",
    };
    onChange({ ...gear, knobs: newKnobs });
    setEditingKnobIndex(null);
  };

  return (
    <div className="border rounded bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1 bg-muted/30">
        {/* Type icon */}
        <span className="text-xs">{GEAR_TYPE_ICONS[gear.type] || "🎛️"}</span>

        {/* Name - editable */}
        <Input
          value={gear.name}
          onChange={(e) => onChange({ ...gear, name: e.target.value })}
          className="flex-1 h-5 text-xs font-medium bg-transparent border-0 focus-visible:ring-0 focus-visible:bg-background px-1"
          placeholder="Gear name"
        />

        {/* Notes button - inline, only when notes not showing */}
        {!effectiveNotesOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-muted-foreground px-1"
            onClick={() => setNotesUserOpened(true)}
          >
            <Plus className="h-2.5 w-2.5 mr-0.5" />
            Notes
          </Button>
        )}

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleAddKnob}>
              <Plus className="mr-2 h-3 w-3" />
              Add Knob
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMoveUp} disabled={gearIndex === 0}>
              <ChevronUp className="mr-2 h-3 w-3" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveDown} disabled={gearIndex === totalGear - 1}>
              <ChevronDown className="mr-2 h-3 w-3" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <Trash2 className="mr-2 h-3 w-3" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="px-2 py-1.5 space-y-1.5">
        {/* Synth-specific: Patch info */}
        {gear.type === "synth" && (
          <div className="flex gap-2">
            <div className="flex-shrink-0">
              <Label className="text-[10px] text-muted-foreground">Patch</Label>
              <Input
                placeholder="16-16"
                value={gear.patch || ""}
                onChange={(e) => onChange({ ...gear, patch: e.target.value })}
                className="w-14 h-5 text-[10px] px-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                placeholder="Patch name"
                value={gear.patchName || ""}
                onChange={(e) => onChange({ ...gear, patchName: e.target.value })}
                className="h-5 text-[10px] px-1"
              />
            </div>
          </div>
        )}

        {/* Knobs */}
        {gear.knobs.length > 0 ? (
          <div className="flex flex-wrap gap-2 items-start">
            {gear.knobs.map((knob, index) => (
              <div key={index} className="flex flex-col items-center">
                <KnobDial
                  value={knob.position}
                  onChange={(pos) => handleKnobChange(index, pos)}
                  size="sm"
                />

                {/* Editable label */}
                {editingKnobIndex === index ? (
                  <Input
                    value={editingKnobLabel}
                    onChange={(e) => setEditingKnobLabel(e.target.value)}
                    onBlur={saveKnobLabel}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveKnobLabel();
                      if (e.key === "Escape") setEditingKnobIndex(null);
                    }}
                    className="w-12 h-4 text-[9px] text-center px-0 mt-0.5"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEditingKnobLabel(index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleRemoveKnob(index);
                    }}
                    className="text-[9px] text-muted-foreground hover:text-foreground truncate max-w-12 mt-0.5"
                    title="Click to edit, right-click to remove"
                  >
                    {knob.label}
                  </button>
                )}
              </div>
            ))}

            {/* Add knob button */}
            <button
              onClick={handleAddKnob}
              className="w-10 h-10 rounded border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/50 flex items-center justify-center"
              title="Add knob"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddKnob}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <CircleDot className="h-3 w-3" />
            Add knobs
          </button>
        )}

        {/* Notes - uncontrolled with debounced save */}
        {effectiveNotesOpen && (
          <Textarea
            defaultValue={gear.notes || ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={(e) => handleNotesBlur(e.target.value)}
            placeholder="Gear notes..."
            className="h-10 text-[10px] resize-none"
            autoFocus={!gear.notes}
          />
        )}
      </div>
    </div>
  );
}
