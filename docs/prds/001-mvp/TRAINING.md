# Training Tools

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md) | [FUTURE_CONSIDERATIONS.md](./FUTURE_CONSIDERATIONS.md)

## Overview

Training tools help musicians practice with:
- **Metronome** - Click track synced to song tempo/time signature
- **Drone Player** - Sustained root note for scale/mode practice

> **Note:** Chord progression player and drum beats are deferred to a future phase. See [FUTURE_CONSIDERATIONS.md](./FUTURE_CONSIDERATIONS.md).

---

## Song-Linked Practice Settings

When practicing a song, the training tools can auto-configure from the song's metadata:

```typescript
// convex/songs.ts
export const getPracticeSettings = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId);
    if (!song) return null;

    return {
      tempo: song.tempo || 120,
      timeSignature: song.timeSignature || "4/4",
      key: song.key,
      mode: song.mode,
      // Pre-configured metronome settings
      metronomeConfig: {
        bpm: song.tempo || 120,
        beatsPerMeasure: parseInt(song.timeSignature?.split("/")[0] || "4"),
        beatUnit: parseInt(song.timeSignature?.split("/")[1] || "4"),
      },
      // Pre-configured drone settings
      droneConfig: song.key ? {
        rootNote: song.key.replace("m", ""),
        isMinor: song.key.includes("m"),
        mode: song.mode,
      } : null,
    };
  },
});
```

---

## Metronome

A visual metronome with tempo control, time signature selection, and beat indicators.

### Features
- BPM slider (40-240 range)
- Time signature selection (3/4, 4/4, 5/4, 6/8, 7/8)
- Visual beat indicators (circles light up on each beat)
- Accented downbeat (higher pitch on beat 1)
- Play/Stop toggle
- Auto-configure from song tempo/time signature

### Implementation

```typescript
// components/training/Metronome.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface MetronomeProps {
  initialBpm?: number;
  initialBeatsPerMeasure?: number;
  songId?: string; // If provided, auto-configures from song
}

export function Metronome({
  initialBpm = 120,
  initialBeatsPerMeasure = 4,
}: MetronomeProps) {
  const [bpm, setBpm] = useState(initialBpm);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(initialBeatsPerMeasure);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const synthRef = useRef<Tone.Synth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();

    return () => {
      synthRef.current?.dispose();
      loopRef.current?.dispose();
    };
  }, []);

  const start = async () => {
    await Tone.start();
    Tone.Transport.bpm.value = bpm;

    let beat = 0;
    loopRef.current = new Tone.Loop((time) => {
      const isDownbeat = beat % beatsPerMeasure === 0;
      synthRef.current?.triggerAttackRelease(
        isDownbeat ? "C5" : "C4",
        "32n",
        time
      );
      setCurrentBeat(beat % beatsPerMeasure);
      beat++;
    }, "4n").start(0);

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stop = () => {
    Tone.Transport.stop();
    loopRef.current?.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Metronome</h3>
        <span className="text-2xl font-mono">{bpm} BPM</span>
      </div>

      <Slider
        value={[bpm]}
        onValueChange={([v]) => setBpm(v)}
        min={40}
        max={240}
        step={1}
        disabled={isPlaying}
      />

      <div className="flex gap-2">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 ${
              currentBeat === i && isPlaying
                ? "bg-primary border-primary"
                : "border-muted-foreground"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={isPlaying ? stop : start}>
          {isPlaying ? "Stop" : "Start"}
        </Button>
        <select
          value={beatsPerMeasure}
          onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
          disabled={isPlaying}
          className="border rounded px-2"
        >
          <option value={3}>3/4</option>
          <option value={4}>4/4</option>
          <option value={5}>5/4</option>
          <option value={6}>6/8</option>
          <option value={7}>7/8</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Drone Player

A sustained tone generator for practicing scales, modes, and ear training.

### Features
- Note selection (C through B, including sharps)
- Octave selection (1, 2, 3 - bass range for grounding)
- Sine wave oscillator (clean, no harmonics)
- Smooth attack/release for pleasant sound
- Live note change while playing
- Auto-configure from song key

### Implementation

```typescript
// components/training/DronePlayer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface DronePlayerProps {
  initialNote?: string;
  initialOctave?: number;
}

export function DronePlayer({
  initialNote = "A",
  initialOctave = 2,
}: DronePlayerProps) {
  const [note, setNote] = useState(initialNote);
  const [octave, setOctave] = useState(initialOctave);
  const [isPlaying, setIsPlaying] = useState(false);

  const synthRef = useRef<Tone.Synth | null>(null);

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1 },
    }).toDestination();

    return () => {
      synthRef.current?.dispose();
    };
  }, []);

  const start = async () => {
    await Tone.start();
    synthRef.current?.triggerAttack(`${note}${octave}`);
    setIsPlaying(true);
  };

  const stop = () => {
    synthRef.current?.triggerRelease();
    setIsPlaying(false);
  };

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (isPlaying) {
      synthRef.current?.setNote(`${newNote}${octave}`);
    }
  };

  const handleOctaveChange = (newOctave: number) => {
    setOctave(newOctave);
    if (isPlaying) {
      synthRef.current?.setNote(`${note}${newOctave}`);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Drone</h3>
        <span className="text-2xl font-mono">{note}{octave}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {NOTES.map((n) => (
          <Button
            key={n}
            variant={note === n ? "default" : "outline"}
            size="sm"
            onClick={() => handleNoteChange(n)}
          >
            {n}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={isPlaying ? stop : start}>
          {isPlaying ? "Stop" : "Start"}
        </Button>
        <select
          value={octave}
          onChange={(e) => handleOctaveChange(Number(e.target.value))}
          className="border rounded px-2"
        >
          <option value={1}>Octave 1</option>
          <option value={2}>Octave 2</option>
          <option value={3}>Octave 3</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Training Page Layout

The training page provides both tools in a clean layout:

```typescript
// app/(dashboard)/training/page.tsx
"use client";

import { Metronome } from "@/components/training/Metronome";
import { DronePlayer } from "@/components/training/DronePlayer";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Training Tools</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Metronome />
        <DronePlayer />
      </div>

      {/* Future: Song selector for auto-configuration */}
    </div>
  );
}
```

---

## Future Enhancements (Deferred)

The following features are planned for future phases:

1. **Chord Progression Player** - Enter chord progressions, play synthesized backing
2. **Drum Beats** - Preset patterns (rock, pop, jazz, shuffle, ballad)
3. **Licks Database** - Curated and AI-generated licks for practice
4. **Custom Drum Samples** - Upload your own drum sounds

See [FUTURE_CONSIDERATIONS.md](./FUTURE_CONSIDERATIONS.md) for details.
