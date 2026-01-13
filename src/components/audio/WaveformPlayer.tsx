"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type WaveSurferType from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaveformPlayerProps {
  url: string;
  peaks?: number[];
  className?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function WaveformPlayer({
  url,
  peaks,
  className,
  onReady,
  onError,
  onTimeUpdate,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Dynamic import for WaveSurfer (client-side only)
  useEffect(() => {
    let ws: WaveSurferType | null = null;
    let isMounted = true;

    const initWaveSurfer = async () => {
      if (!containerRef.current) return;

      const WaveSurfer = (await import("wavesurfer.js")).default;

      if (!isMounted) return;

      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "hsl(var(--muted-foreground))",
        progressColor: "hsl(var(--primary))",
        cursorColor: "hsl(var(--primary))",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        normalize: true,
        ...(peaks && { peaks: [peaks] }),
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        if (!isMounted) return;
        setIsReady(true);
        setIsLoading(false);
        setDuration(ws?.getDuration() ?? 0);
        onReady?.();
      });

      ws.on("play", () => {
        if (isMounted) setIsPlaying(true);
      });
      ws.on("pause", () => {
        if (isMounted) setIsPlaying(false);
      });
      ws.on("finish", () => {
        if (isMounted) setIsPlaying(false);
      });

      ws.on("timeupdate", (time) => {
        if (!isMounted) return;
        setCurrentTime(time);
        onTimeUpdate?.(time);
      });

      ws.on("error", (err) => {
        if (!isMounted) return;
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      });

      try {
        await ws.load(url);
      } catch (err) {
        if (isMounted) {
          setIsLoading(false);
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initWaveSurfer();

    return () => {
      isMounted = false;
      if (ws) {
        ws.destroy();
      }
    };
  }, [url, peaks, onReady, onError, onTimeUpdate]);

  // Update volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Update playback rate
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const skipBack = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, currentTime - 5);
      wavesurferRef.current.seekTo(newTime / duration);
    }
  }, [currentTime, duration]);

  const skipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, currentTime + 5);
      wavesurferRef.current.seekTo(newTime / duration);
    }
  }, [currentTime, duration]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Waveform Container */}
        <div
          ref={containerRef}
          className={cn(
            "w-full rounded bg-muted/50 overflow-hidden",
            isLoading && "animate-pulse"
          )}
        />

        {/* Time Display */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBack}
            disabled={!isReady}
            title="Skip back 5s"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            className="h-12 w-12 rounded-full"
            onClick={togglePlay}
            disabled={!isReady}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            disabled={!isReady}
            title="Skip forward 5s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume & Playback Rate Controls */}
        <div className="flex items-center gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={([v]) => {
                setVolume(v / 100);
                if (v > 0) setIsMuted(false);
              }}
              min={0}
              max={100}
              step={1}
              className="w-24"
            />
          </div>

          {/* Playback Rate */}
          <div className="flex items-center gap-1">
            {playbackRates.map((rate) => (
              <Button
                key={rate}
                variant={playbackRate === rate ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPlaybackRate(rate)}
                disabled={!isReady}
              >
                {rate}x
              </Button>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-center text-muted-foreground">
          Space: Play/Pause | Left/Right: Seek 5s
        </div>
      </CardContent>
    </Card>
  );
}
