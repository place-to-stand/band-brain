# Training Tools

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md)

## Overview

Training tools help musicians practice with:
- **Metronome** - Click track synced to song tempo/time signature
- **Drone Player** - Sustained root note/chord for scale practice
- **Chord Progression Player** - Backing chords with drum beats

---

## Song-Linked Practice Settings

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
          onChange={(e) => setOctave(Number(e.target.value))}
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

## Chord Progression Player with Drums

### Preset Drum Styles

| Style | Description |
|-------|-------------|
| **Rock** | Kick on 1 & 3, snare on 2 & 4, 8th note hi-hat |
| **Pop** | Lighter rock variant with syncopated kick |
| **Jazz** | Swing pattern with ride cymbal |
| **Shuffle** | Triplet-feel blues shuffle |
| **Ballad** | Sparse, slow pattern |

### Implementation

```typescript
// components/training/ChordProgressionPlayer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

interface Chord {
  name: string; // e.g., "Am", "G", "F"
  bars: number; // Number of bars to hold this chord
}

type DrumStyle = "rock" | "pop" | "jazz" | "shuffle" | "ballad";

const DRUM_PATTERNS: Record<DrumStyle, { kick: number[]; snare: number[]; hihat: number[] }> = {
  rock: {
    kick: [0, 2],
    snare: [1, 3],
    hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
  },
  pop: {
    kick: [0, 2.5],
    snare: [1, 3],
    hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
  },
  jazz: {
    kick: [0, 2.5],
    snare: [1.67, 3.67],
    hihat: [0, 1, 2, 3],
  },
  shuffle: {
    kick: [0, 2],
    snare: [1, 3],
    hihat: [0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67],
  },
  ballad: {
    kick: [0],
    snare: [2],
    hihat: [0, 1, 2, 3],
  },
};

export function ChordProgressionPlayer() {
  const [chords, setChords] = useState<Chord[]>([
    { name: "Am", bars: 1 },
    { name: "G", bars: 1 },
    { name: "F", bars: 1 },
    { name: "E", bars: 1 },
  ]);
  const [bpm, setBpm] = useState(120);
  const [drumStyle, setDrumStyle] = useState<DrumStyle>("rock");
  const [drumsEnabled, setDrumsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const chordSynthRef = useRef<Tone.PolySynth | null>(null);
  const drumSamplerRef = useRef<Tone.Sampler | null>(null);

  useEffect(() => {
    // Chord synth (pad sound)
    chordSynthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.5, decay: 0.1, sustain: 0.8, release: 1 },
    }).toDestination();

    // Drum sampler
    drumSamplerRef.current = new Tone.Sampler({
      C2: "/samples/drums/kick.wav",
      D2: "/samples/drums/snare.wav",
      "F#2": "/samples/drums/hihat.wav",
    }).toDestination();

    return () => {
      chordSynthRef.current?.dispose();
      drumSamplerRef.current?.dispose();
    };
  }, []);

  const play = async () => {
    await Tone.start();
    Tone.Transport.bpm.value = bpm;
    // Schedule chords and drums...
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Chord Progression</h3>

      {/* Chord list editor */}
      {/* BPM slider */}
      {/* Drum style selector */}
      {/* Drums toggle */}
      {/* Play/Stop button */}
    </div>
  );
}
```

### Drum Sample Requirements

Users can upload their own drum samples:

| Sample | Purpose |
|--------|---------|
| `kick.wav` | Bass drum / kick |
| `snare.wav` | Snare drum |
| `hihat.wav` | Closed hi-hat |

Default samples provided in `/public/samples/drums/`.
