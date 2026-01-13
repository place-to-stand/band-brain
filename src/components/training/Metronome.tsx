"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetronomeProps {
  initialTempo?: number;
  initialTimeSignature?: string;
  className?: string;
}

const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8", "12/8"];
const PRESET_TEMPOS = [60, 80, 100, 120, 140, 160];

export function Metronome({
  initialTempo = 120,
  initialTimeSignature = "4/4",
  className,
}: MetronomeProps) {
  const [tempo, setTempo] = useState(initialTempo);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [, setTapTimes] = useState<number[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const currentBeatRef = useRef(0);
  const tempoRef = useRef(tempo);
  const beatsPerMeasureRef = useRef(parseInt(timeSignature.split("/")[0]));
  const schedulerRef = useRef<(() => void) | null>(null);

  // Keep refs in sync
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    beatsPerMeasureRef.current = parseInt(timeSignature.split("/")[0]);
  }, [timeSignature]);

  const beatsPerMeasure = parseInt(timeSignature.split("/")[0]);

  const playClick = useCallback((isAccent: boolean) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(isAccent ? 0.3 : 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  // Initialize scheduler function in ref to avoid self-reference issues
  useEffect(() => {
    schedulerRef.current = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
        const isAccent = currentBeatRef.current === 0;
        playClick(isAccent);

        const secondsPerBeat = 60.0 / tempoRef.current;
        nextNoteTimeRef.current += secondsPerBeat;

        currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasureRef.current;
        setCurrentBeat(currentBeatRef.current);
      }

      timerIdRef.current = window.setTimeout(() => schedulerRef.current?.(), 25);
    };
  }, [playClick]);

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
    currentBeatRef.current = 0;
  }, []);

  const start = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    audioContextRef.current.resume();
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    currentBeatRef.current = 0;
    setCurrentBeat(0);
    setIsPlaying(true);
    schedulerRef.current?.();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  const adjustTempo = useCallback((delta: number) => {
    setTempo((prev) => Math.max(20, Math.min(300, prev + delta)));
  }, []);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    setTapTimes((prevTaps) => {
      const recentTaps = [...prevTaps, now].filter((t) => now - t < 3000);

      if (recentTaps.length >= 2) {
        const intervals = recentTaps.slice(1).map((t, i) => t - recentTaps[i]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const calculatedTempo = Math.round(60000 / avgInterval);
        setTempo(Math.max(20, Math.min(300, calculatedTempo)));
      }

      return recentTaps;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Metronome</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tempo Display */}
        <div className="text-center">
          <div className="text-6xl font-bold tabular-nums">{tempo}</div>
          <div className="text-sm text-muted-foreground">BPM</div>
        </div>

        {/* Beat Indicators */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-4 rounded-full transition-all",
                currentBeat === i && isPlaying
                  ? i === 0
                    ? "bg-primary scale-125"
                    : "bg-primary/60 scale-110"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Tempo Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustTempo(-5)}
            disabled={tempo <= 20}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            className="h-16 w-16 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => adjustTempo(5)}
            disabled={tempo >= 300}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Tempo Input */}
        <div className="space-y-2">
          <Label htmlFor="tempo">Tempo</Label>
          <Input
            id="tempo"
            type="number"
            min="20"
            max="300"
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value) || 120)}
            className="text-center"
          />
        </div>

        {/* Time Signature */}
        <div className="space-y-2">
          <Label>Time Signature</Label>
          <div className="flex flex-wrap gap-2">
            {TIME_SIGNATURES.map((ts) => (
              <Button
                key={ts}
                variant={timeSignature === ts ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeSignature(ts)}
              >
                {ts}
              </Button>
            ))}
          </div>
        </div>

        {/* Preset Tempos */}
        <div className="space-y-2">
          <Label>Presets</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPOS.map((t) => (
              <Button
                key={t}
                variant={tempo === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTempo(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Tap Tempo */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleTapTempo}
        >
          Tap Tempo
        </Button>
      </CardContent>
    </Card>
  );
}
