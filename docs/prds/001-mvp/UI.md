# UI Components & Structure

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md)

## Overview

The app uses:
- **Next.js 14+** App Router with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** for component primitives
- **wavesurfer.js** for waveform visualization
- **AlphaTab** for Guitar Pro rendering (lazy loaded)
- **Tone.js** for audio synthesis (training tools)

---

## Route Structure

```
app/
├── (auth)/                    # Unauthenticated routes
│   └── sign-in/
│       └── page.tsx           # Google Sign-In
│
├── (dashboard)/               # Protected routes (require auth)
│   ├── layout.tsx             # Auth check, sidebar navigation
│   │
│   ├── bands/
│   │   ├── page.tsx           # Band list
│   │   ├── [bandId]/
│   │   │   ├── page.tsx       # Band dashboard
│   │   │   ├── songs/
│   │   │   │   ├── page.tsx   # Song list
│   │   │   │   └── [songId]/
│   │   │   │       └── page.tsx # Song detail
│   │   │   ├── setlists/
│   │   │   │   ├── page.tsx   # Setlist list
│   │   │   │   └── [setlistId]/
│   │   │   │       └── page.tsx # Setlist view
│   │   │   └── members/
│   │   │       └── page.tsx   # Member management
│   │   └── join/
│   │       └── page.tsx       # Join via invite code
│   │
│   ├── recording/
│   │   ├── page.tsx           # Recording projects list
│   │   └── [projectId]/
│   │       └── page.tsx       # Project detail with tracking grid
│   │
│   ├── training/
│   │   └── page.tsx           # Metronome, drone, chord player
│   │
│   └── settings/
│       └── page.tsx           # User settings, data export
│
└── api/                       # API routes (if needed)
```

---

## Component Organization

```
components/
├── ui/                        # shadcn/ui primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   ├── dialog.tsx
│   └── ...
│
├── auth/
│   └── GoogleSignInButton.tsx
│
├── audio/
│   ├── WaveformPlayer.tsx     # wavesurfer.js wrapper
│   └── AudioUploader.tsx      # File upload with progress
│
├── tab/
│   └── AlphaTabViewer.tsx     # Guitar Pro viewer (lazy)
│
├── gear/
│   ├── KnobDial.tsx           # Visual knob control
│   ├── GearPieceEditor.tsx    # Single gear piece
│   └── GearSettingsEditor.tsx # Full gear chain
│
├── training/
│   ├── Metronome.tsx
│   ├── DronePlayer.tsx
│   └── ChordProgressionPlayer.tsx
│
├── recording/
│   ├── TrackingGrid.tsx       # Status matrix
│   └── BouncePlayer.tsx       # Waveform + comments
│
├── setlist/
│   ├── SetlistView.tsx        # Full setlist display
│   ├── SetlistItemCard.tsx    # Single song in setlist
│   └── GearDeltaDisplay.tsx   # Gear changes visualization
│
├── song/
│   ├── SongCard.tsx           # Song in list view
│   ├── SongDetail.tsx         # Full song view
│   ├── SongSectionEditor.tsx  # Section management
│   └── PracticeStatusBadge.tsx
│
├── band/
│   ├── BandCard.tsx
│   ├── InviteCodeGenerator.tsx
│   └── MemberList.tsx
│
└── ErrorBoundary.tsx          # Global error handling
```

---

## Error Boundary

```typescript
// components/ErrorBoundary.tsx
"use client";

import { Component, ReactNode } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    posthog.captureException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Usage in Layout

```typescript
// app/(dashboard)/layout.tsx
"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
```

---

## AlphaTab Integration (Lazy Loaded)

```typescript
// components/tab/AlphaTabViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

interface AlphaTabViewerProps {
  fileUrl: string;
  fileName?: string;
}

// Lazy load AlphaTab only when component is used
export function AlphaTabViewer({ fileUrl, fileName }: AlphaTabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let api: any = null;

    const loadAlphaTab = async () => {
      try {
        // Dynamic import - only loads when needed
        const alphaTab = await import("alphatab");

        if (!containerRef.current) return;

        api = new alphaTab.AlphaTabApi(containerRef.current, {
          core: {
            file: fileUrl,
            fontDirectory: "/fonts/alphatab/",
          },
          display: {
            layoutMode: alphaTab.LayoutMode.Page,
            staveProfile: alphaTab.StaveProfile.Default,
          },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont: "/soundfonts/default.sf2",
          },
        });

        api.renderStarted.on(() => setIsLoading(true));
        api.renderFinished.on(() => setIsLoading(false));
        api.error.on((e: any) => setError(e.message));
      } catch (err) {
        setError("Failed to load tab viewer");
        setIsLoading(false);
      }
    };

    loadAlphaTab();

    return () => {
      api?.destroy();
    };
  }, [fileUrl]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p>Loading tab...</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          <p>Error: {error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full min-h-[400px]" />
    </div>
  );
}
```

---

## Waveform Player

```typescript
// components/audio/WaveformPlayer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface WaveformPlayerProps {
  audioUrl: string;
  waveformPeaks?: number[];
  onTimeUpdate?: (time: number) => void;
}

export function WaveformPlayer({
  audioUrl,
  waveformPeaks,
  onTimeUpdate,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4a5568",
      progressColor: "#3182ce",
      cursorColor: "#e53e3e",
      height: 80,
      normalize: true,
      peaks: waveformPeaks ? [waveformPeaks] : undefined,
    });

    wavesurferRef.current.load(audioUrl);

    wavesurferRef.current.on("ready", () => {
      setDuration(wavesurferRef.current?.getDuration() || 0);
    });

    wavesurferRef.current.on("audioprocess", () => {
      const time = wavesurferRef.current?.getCurrentTime() || 0;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    wavesurferRef.current.on("play", () => setIsPlaying(true));
    wavesurferRef.current.on("pause", () => setIsPlaying(false));
    wavesurferRef.current.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [audioUrl, waveformPeaks, onTimeUpdate]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    wavesurferRef.current?.setVolume(newVolume);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full" />

      <div className="flex items-center gap-4">
        <Button
          onClick={() => wavesurferRef.current?.playPause()}
          variant="outline"
        >
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <span className="font-mono text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm">🔊</span>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Practice Status Badge

```typescript
// components/song/PracticeStatusBadge.tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      status: {
        new: "bg-gray-100 text-gray-800",
        learning: "bg-yellow-100 text-yellow-800",
        solid: "bg-blue-100 text-blue-800",
        performance_ready: "bg-green-100 text-green-800",
      },
    },
    defaultVariants: {
      status: "new",
    },
  }
);

const STATUS_LABELS = {
  new: "New",
  learning: "Learning",
  solid: "Solid",
  performance_ready: "Performance Ready",
};

interface PracticeStatusBadgeProps
  extends VariantProps<typeof badgeVariants> {
  status: "new" | "learning" | "solid" | "performance_ready";
}

export function PracticeStatusBadge({ status }: PracticeStatusBadgeProps) {
  return (
    <span className={badgeVariants({ status })}>
      {STATUS_LABELS[status]}
    </span>
  );
}
```

---

## Loading States

```typescript
// components/ui/loading.tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-lg border p-4 animate-pulse">
      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
      <div className="h-3 w-1/2 bg-muted rounded" />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}
```

---

## Mobile-First Responsive Patterns

```typescript
// Example: Responsive song card
export function SongCard({ song }: { song: Song }) {
  return (
    <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Title - full width on mobile, auto on desktop */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{song.title}</h3>
          <p className="text-sm text-muted-foreground">
            {song.key && `${song.key} • `}
            {song.tempo && `${song.tempo} BPM`}
          </p>
        </div>

        {/* Status badge - right aligned on desktop */}
        <div className="flex items-center gap-2">
          <PracticeStatusBadge status={song.practiceStatus} />
          {song.durationSeconds && (
            <span className="text-sm text-muted-foreground">
              {formatDuration(song.durationSeconds)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Form Handling Pattern

```typescript
// Example: Create song form with React Hook Form + Zod
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const songSchema = z.object({
  title: z.string().min(1, "Title is required"),
  key: z.string().optional(),
  mode: z.enum(["major", "minor", "dorian", "mixolydian"]).optional(),
  tempo: z.number().min(20).max(300).optional(),
  timeSignature: z.string().optional(),
  durationSeconds: z.number().min(0).optional(),
});

type SongFormData = z.infer<typeof songSchema>;

export function CreateSongForm({ bandId }: { bandId: string }) {
  const createSong = useMutation(api.songs.create);

  const form = useForm<SongFormData>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: "",
      tempo: 120,
      timeSignature: "4/4",
    },
  });

  const onSubmit = async (data: SongFormData) => {
    try {
      await createSong({ bandId, ...data });
      form.reset();
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

---

## Key shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| `Button` | Actions, submit buttons |
| `Input` | Text fields |
| `Slider` | Volume, tempo, knob values |
| `Switch` | Toggle on/off states |
| `Dialog` | Modals, confirmations |
| `DropdownMenu` | Context menus, song actions |
| `Select` | Status dropdowns, key selection |
| `Tabs` | Song sections, view modes |
| `Card` | Content containers |
| `Badge` | Status indicators |
| `Tooltip` | Hover hints |

Install via:
```bash
npx shadcn@latest add button input slider switch dialog dropdown-menu select tabs card badge tooltip
```
