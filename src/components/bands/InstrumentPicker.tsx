"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Common instruments for band members
const INSTRUMENTS = [
  { id: "guitar", label: "Guitar" },
  { id: "bass", label: "Bass" },
  { id: "drums", label: "Drums" },
  { id: "keys", label: "Keys/Piano" },
  { id: "synth", label: "Synth" },
  { id: "vocals", label: "Vocals" },
  { id: "percussion", label: "Percussion" },
  { id: "strings", label: "Strings" },
  { id: "brass", label: "Brass" },
  { id: "woodwinds", label: "Woodwinds" },
  { id: "other", label: "Other" },
] as const;

interface InstrumentPickerProps {
  value: string[];
  onChange: (instruments: string[]) => void;
  disabled?: boolean;
}

export function InstrumentPicker({
  value,
  onChange,
  disabled = false,
}: InstrumentPickerProps) {
  const handleToggle = (instrumentId: string) => {
    if (disabled) return;

    if (value.includes(instrumentId)) {
      onChange(value.filter((i) => i !== instrumentId));
    } else {
      onChange([...value, instrumentId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Instruments</Label>
      <div className="grid grid-cols-2 gap-2">
        {INSTRUMENTS.map((instrument) => (
          <div key={instrument.id} className="flex items-center space-x-2">
            <Checkbox
              id={`instrument-${instrument.id}`}
              checked={value.includes(instrument.id)}
              onCheckedChange={() => handleToggle(instrument.id)}
              disabled={disabled}
            />
            <Label
              htmlFor={`instrument-${instrument.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              {instrument.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export { INSTRUMENTS };
