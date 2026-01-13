"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DronePlayerProps {
  initialNote?: string;
  initialOctave?: number;
  className?: string;
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [2, 3, 4, 5];

// Frequencies for C0 through B0 (then multiply by 2^octave)
const BASE_FREQUENCIES: Record<string, number> = {
  "C": 16.35,
  "C#": 17.32,
  "D": 18.35,
  "D#": 19.45,
  "E": 20.60,
  "F": 21.83,
  "F#": 23.12,
  "G": 24.50,
  "G#": 25.96,
  "A": 27.50,
  "A#": 29.14,
  "B": 30.87,
};

export function DronePlayer({
  initialNote = "A",
  initialOctave = 3,
  className,
}: DronePlayerProps) {
  const [note, setNote] = useState(initialNote);
  const [octave, setOctave] = useState(initialOctave);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [includeFifth, setIncludeFifth] = useState(false);
  const [includeThird, setIncludeThird] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  const getFrequency = useCallback((noteName: string, oct: number): number => {
    return BASE_FREQUENCIES[noteName] * Math.pow(2, oct);
  }, []);

  const getFifth = useCallback((noteName: string): string => {
    const noteIndex = NOTES.indexOf(noteName);
    return NOTES[(noteIndex + 7) % 12];
  }, []);

  const getMajorThird = useCallback((noteName: string): string => {
    const noteIndex = NOTES.indexOf(noteName);
    return NOTES[(noteIndex + 4) % 12];
  }, []);

  const startDrone = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    ctx.resume();

    // Create gain node
    gainNodeRef.current = ctx.createGain();
    gainNodeRef.current.gain.value = volume / 100;
    gainNodeRef.current.connect(ctx.destination);

    // Create oscillators
    const frequencies: number[] = [getFrequency(note, octave)];

    if (includeFifth) {
      const fifthNote = getFifth(note);
      frequencies.push(getFrequency(fifthNote, octave));
    }

    if (includeThird) {
      const thirdNote = getMajorThird(note);
      frequencies.push(getFrequency(thirdNote, octave));
    }

    oscillatorsRef.current = frequencies.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Slightly detune harmonics for richness
      if (i > 0) {
        osc.detune.value = Math.random() * 5 - 2.5;
      }

      const oscGain = ctx.createGain();
      oscGain.gain.value = i === 0 ? 0.5 : 0.3;

      osc.connect(oscGain);
      oscGain.connect(gainNodeRef.current!);
      osc.start();

      return osc;
    });

    setIsPlaying(true);
  }, [note, octave, volume, includeFifth, includeThird, getFrequency, getFifth, getMajorThird]);

  const stopDrone = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => {
      osc.stop();
      osc.disconnect();
    });
    oscillatorsRef.current = [];

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopDrone();
    } else {
      startDrone();
    }
  }, [isPlaying, startDrone, stopDrone]);

  // Update volume while playing
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // Store playing state in ref to avoid effect issues
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDrone();
    };
  }, [stopDrone]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Drone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Note Display */}
        <div className="text-center">
          <div className="text-6xl font-bold">
            {note}
            <sub className="text-2xl">{octave}</sub>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {Math.round(getFrequency(note, octave))} Hz
          </div>
        </div>

        {/* Play Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full",
              isPlaying && "bg-green-600 hover:bg-green-700"
            )}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
        </div>

        {/* Note Selection */}
        <div className="space-y-2">
          <Label>Root Note</Label>
          <div className="grid grid-cols-6 gap-2">
            {NOTES.map((n) => (
              <Button
                key={n}
                variant={note === n ? "default" : "outline"}
                size="sm"
                onClick={() => setNote(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        {/* Octave Selection */}
        <div className="space-y-2">
          <Label>Octave</Label>
          <div className="flex gap-2">
            {OCTAVES.map((oct) => (
              <Button
                key={oct}
                variant={octave === oct ? "default" : "outline"}
                onClick={() => setOctave(oct)}
              >
                {oct}
              </Button>
            ))}
          </div>
        </div>

        {/* Harmonics */}
        <div className="space-y-2">
          <Label>Harmonics</Label>
          <div className="flex gap-2">
            <Button
              variant={includeFifth ? "default" : "outline"}
              onClick={() => setIncludeFifth(!includeFifth)}
            >
              + Fifth ({getFifth(note)})
            </Button>
            <Button
              variant={includeThird ? "default" : "outline"}
              onClick={() => setIncludeThird(!includeThird)}
            >
              + Third ({getMajorThird(note)})
            </Button>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Volume
          </Label>
          <Slider
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </CardContent>
    </Card>
  );
}
