"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GearPiece } from "./GearPieceEditor";

interface AddGearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (gear: GearPiece) => void;
  previousGearNames?: string[];
}

const GEAR_TYPES = [
  { value: "pedal", label: "Pedal", icon: "🎸", description: "Effects pedal" },
  { value: "synth", label: "Synth", icon: "🎹", description: "Synthesizer with patches" },
  { value: "amp", label: "Amp", icon: "📻", description: "Amplifier" },
  { value: "other", label: "Other", icon: "🎛️", description: "Other gear" },
] as const;

// Common gear templates with pre-configured knobs
const GEAR_TEMPLATES: Record<string, { knobs: { label: string; position: number }[] }> = {
  // Pedals
  "Tube Screamer": { knobs: [{ label: "Drive", position: 0.5 }, { label: "Tone", position: 0.5 }, { label: "Level", position: 0.5 }] },
  "Big Muff": { knobs: [{ label: "Sustain", position: 0.5 }, { label: "Tone", position: 0.5 }, { label: "Volume", position: 0.5 }] },
  "Blues Driver": { knobs: [{ label: "Level", position: 0.5 }, { label: "Tone", position: 0.5 }, { label: "Gain", position: 0.5 }] },
  "Delay Pedal": { knobs: [{ label: "Time", position: 0.5 }, { label: "Feedback", position: 0.3 }, { label: "Mix", position: 0.5 }] },
  "Reverb Pedal": { knobs: [{ label: "Decay", position: 0.5 }, { label: "Tone", position: 0.5 }, { label: "Mix", position: 0.4 }] },
  // Amps
  "Fender Twin": { knobs: [{ label: "Volume", position: 0.3 }, { label: "Treble", position: 0.6 }, { label: "Bass", position: 0.5 }, { label: "Reverb", position: 0.3 }] },
  "Marshall JCM800": { knobs: [{ label: "Pre", position: 0.5 }, { label: "Master", position: 0.3 }, { label: "Treble", position: 0.6 }, { label: "Mid", position: 0.5 }, { label: "Bass", position: 0.5 }] },
  "Vox AC30": { knobs: [{ label: "Normal", position: 0.5 }, { label: "Top Cut", position: 0.5 }, { label: "Treble", position: 0.6 }, { label: "Bass", position: 0.5 }] },
};

export function AddGearDialog({
  open,
  onOpenChange,
  onAdd,
  previousGearNames = [],
}: AddGearDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("pedal");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Combine templates and previous gear names for suggestions
  const allSuggestions = useMemo(() => {
    const templateNames = Object.keys(GEAR_TEMPLATES);
    const combined = new Set([...templateNames, ...previousGearNames]);
    return Array.from(combined).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [previousGearNames]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return allSuggestions.slice(0, 8); // Show first 8 when empty

    const query = name.toLowerCase();
    return allSuggestions
      .filter((s) => s.toLowerCase().includes(query))
      .slice(0, 8);
  }, [name, allSuggestions]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    setIsSubmitting(true);

    // Check if we have a template for this gear
    const template = GEAR_TEMPLATES[name.trim()];
    const defaultKnobs = template?.knobs || [];

    const newGear: GearPiece = {
      name: name.trim(),
      type: selectedType,
      enabled: true,
      knobs: defaultKnobs,
    };

    onAdd(newGear);

    // Reset form
    setName("");
    setSelectedType("pedal");
    setIsSubmitting(false);
    setShowSuggestions(false);
    onOpenChange(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const isTemplate = (gearName: string) => gearName in GEAR_TEMPLATES;
  const isPreviouslyUsed = (gearName: string) =>
    previousGearNames.includes(gearName) && !(gearName in GEAR_TEMPLATES);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Gear</DialogTitle>
          <DialogDescription>
            Add a pedal, synth, amp, or other gear to track settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type selection */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {GEAR_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors",
                    selectedType === type.value
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name input with autocomplete */}
          <div className="space-y-2 relative">
            <Label htmlFor="gear-name">Name</Label>
            <Input
              id="gear-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedType === "pedal"
                  ? "e.g., Tube Screamer, Big Muff"
                  : selectedType === "synth"
                  ? "e.g., Sub 37, Prophet 6"
                  : selectedType === "amp"
                  ? "e.g., Fender Twin, Marshall JCM800"
                  : "e.g., DI Box, Mixer"
              }
              autoFocus
              autoComplete="off"
            />

            {/* Autocomplete dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                      name.toLowerCase() === suggestion.toLowerCase() && "bg-accent"
                    )}
                  >
                    <span>{suggestion}</span>
                    {isTemplate(suggestion) && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Template
                      </Badge>
                    )}
                    {isPreviouslyUsed(suggestion) && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        Used before
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {name && GEAR_TEMPLATES[name.trim()] && (
              <p className="text-xs text-muted-foreground">
                Template found - knobs will be pre-configured
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            Add Gear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
