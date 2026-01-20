# Gear Settings & Visual Knobs

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md) | [SETLISTS.md](./SETLISTS.md)

## Overview

Gear settings allow musicians to track their equipment configuration per song section. The UI uses visual knob dials that mimic real hardware.

---

## Visual Knob System

### Knob Position

- **Range:** 0-1 (float)
- **Visual:** 7 o'clock (0) to 5 o'clock (1) like real knobs
- **Labels:** User-defined (e.g., "Gain", "Tone", "Drive")

```
      0.5 (12 o'clock)
         │
    ┌────┴────┐
    │    │    │
  0 ├────┼────┤ 1
    │         │
    └─────────┘
  7 o'clock  5 o'clock
```

### Data Structure

```typescript
// A single knob
interface Knob {
  label: string;    // e.g., "Gain", "Tone"
  position: number; // 0-1 range
}

// A gear piece (pedal, synth, amp)
interface GearPiece {
  name: string;      // e.g., "Tube Screamer"
  type: string;      // 'pedal' | 'synth' | 'amp' | 'other'
  enabled: boolean;  // On/off state
  knobs: Knob[];     // User-defined knobs
  // Synth-specific
  patch?: string;    // e.g., "16-16"
  patchName?: string; // e.g., "ArcadeArp~"
  isOverride?: boolean; // True if knob differs from patch default
  notes?: string;
}

// Section gear settings
interface GearSettings {
  gear: GearPiece[]; // In signal chain order
  notes?: string;
}
```

---

## Knob Dial Component

```typescript
// components/gear/KnobDial.tsx
"use client";

import { useState, useRef, useCallback } from "react";

interface KnobDialProps {
  label: string;
  value: number; // 0-1
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function KnobDial({ label, value, onChange, disabled }: KnobDialProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert 0-1 to rotation degrees (-135 to 135)
  const rotation = (value * 270) - 135;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle from center
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const degrees = (angle * 180) / Math.PI;

    // Convert to 0-1 range (accounting for dead zone at bottom)
    let normalized = (degrees + 135) / 270;
    normalized = Math.max(0, Math.min(1, normalized));

    onChange(normalized);
  }, [isDragging, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={knobRef}
        className={`
          w-12 h-12 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800
          border-2 border-zinc-500 cursor-pointer relative
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Indicator line */}
        <div
          className="absolute w-1 h-4 bg-white rounded-full top-1 left-1/2 -translate-x-1/2 origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
```

---

## Gear Piece Editor

```typescript
// components/gear/GearPieceEditor.tsx
"use client";

import { useState } from "react";
import { KnobDial } from "./KnobDial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface GearPieceEditorProps {
  gear: GearPiece;
  onChange: (gear: GearPiece) => void;
  onRemove: () => void;
}

export function GearPieceEditor({ gear, onChange, onRemove }: GearPieceEditorProps) {
  const handleKnobChange = (index: number, position: number) => {
    const newKnobs = [...gear.knobs];
    newKnobs[index] = { ...newKnobs[index], position };
    onChange({ ...gear, knobs: newKnobs });
  };

  const handleAddKnob = () => {
    onChange({
      ...gear,
      knobs: [...gear.knobs, { label: "New Knob", position: 0.5 }],
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={gear.enabled}
            onCheckedChange={(enabled) => onChange({ ...gear, enabled })}
          />
          <Input
            value={gear.name}
            onChange={(e) => onChange({ ...gear, name: e.target.value })}
            className="w-40"
          />
          <span className="text-xs text-muted-foreground">{gear.type}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      {/* Synth patch field */}
      {gear.type === "synth" && (
        <div className="flex gap-2">
          <Input
            placeholder="Patch #"
            value={gear.patch || ""}
            onChange={(e) => onChange({ ...gear, patch: e.target.value })}
            className="w-24"
          />
          <Input
            placeholder="Patch name"
            value={gear.patchName || ""}
            onChange={(e) => onChange({ ...gear, patchName: e.target.value })}
            className="flex-1"
          />
        </div>
      )}

      {/* Knobs */}
      <div className="flex flex-wrap gap-4">
        {gear.knobs.map((knob, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <KnobDial
              label={knob.label}
              value={knob.position}
              onChange={(pos) => handleKnobChange(index, pos)}
              disabled={!gear.enabled}
            />
            <Input
              value={knob.label}
              onChange={(e) => {
                const newKnobs = [...gear.knobs];
                newKnobs[index] = { ...newKnobs[index], label: e.target.value };
                onChange({ ...gear, knobs: newKnobs });
              }}
              className="w-16 text-xs text-center h-6"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddKnob}>
          + Knob
        </Button>
      </div>
    </div>
  );
}
```

---

## Creating User-Defined Gear

Users create their own gear pieces with custom knobs:

1. **Add Gear** → Select type (pedal/synth/amp/other)
2. **Name it** → "Tube Screamer", "Sub 37", etc.
3. **Add knobs** → Define labels matching their real gear
4. **Adjust positions** → Set knob positions for this song section

### Default Gear Templates (Optional Enhancement)

Could pre-populate common gear:
- **Tube Screamer:** Drive, Tone, Level
- **Big Muff:** Sustain, Tone, Volume
- **Sub 37:** Cutoff, Resonance, Osc Mix

---

## Synth Patch Overrides

For synths, store:
- **patch**: Patch number/location (e.g., "16-16")
- **patchName**: Human-readable name (e.g., "ArcadeArp~")
- **isOverride**: Only mark knobs that differ from patch defaults

This keeps storage efficient - only store what changes from the patch.

---

## Section-Level Gear

Gear settings are stored per **section** of a song (intro, verse, chorus, etc.):

```typescript
// Song has multiple sections
const sections = [
  {
    name: "Intro",
    position: 0,
    gearSettings: {
      gear: [
        { name: "Tube Screamer", type: "pedal", enabled: true, knobs: [...] },
        { name: "Deluxe Reverb", type: "amp", enabled: true, knobs: [...] },
      ],
    },
  },
  {
    name: "Verse",
    position: 1,
    gearSettings: {
      gear: [
        { name: "Tube Screamer", type: "pedal", enabled: false, knobs: [...] },
        // Changed!
      ],
    },
  },
];
```

This allows tracking gear changes **within** a song, not just between songs.

---

## Gear Delta Computation

See [SETLISTS.md](./SETLISTS.md) for how gear changes between songs are computed for setlist display.
