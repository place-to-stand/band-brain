# BandBrain - Musician Practice & Recording Management App

## Executive Summary

BandBrain is a web application designed to help gigging musicians efficiently manage their practice routines across multiple bands, track personal learning projects (repertoire), coordinate recording sessions, and improve their musicianship through integrated training tools.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14+ (App Router) | Server components, API routes, TypeScript |
| **Backend/Database** | Convex | Reactive database, realtime subscriptions, built-in file storage, TypeScript schema |
| **Auth** | Convex Auth (Password) | Built-in, no external service, email/password with password reset |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible components |
| **Deployment** | Vercel | Seamless Next.js integration |
| **File Storage** | Convex Storage | Built-in, no separate bucket config needed |
| **Audio Analysis** | Essentia.js + Paid API fallback | Browser-based analysis with server backup |
| **Tab Rendering** | AlphaTab | Guitar Pro format support, MIDI playback |
| **Waveform Visualization** | wavesurfer.js | Interactive waveforms with regions/comments |
| **Error Tracking** | PostHog | Production error monitoring & analytics |
| **Testing** | Vitest + Playwright | Unit tests + E2E |

---

## Authentication: Convex Auth

### Why Convex Auth (vs Clerk)

| Aspect | Convex Auth | Clerk |
|--------|-------------|-------|
| **Cost** | Free (included) | Paid after free tier |
| **Setup** | Single service | External integration |
| **Features** | Email/password, OAuth, magic links | More enterprise features |
| **Complexity** | Lower | Higher |

For MVP, Convex Auth with Password provider is sufficient. Can migrate to Clerk later if needed for SSO/MFA.

### Setup

```typescript
// convex/auth.ts
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password<DataModel>()],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.profile.email || "",
        name: args.profile.name,
        createdAt: Date.now(),
      });
      
      return userId;
    },
  },
});
```

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

### Password Reset Flow

For production, password reset requires an email provider (Resend, SendGrid). For MVP, we can start without it and add later.

```typescript
// Future: convex/auth.ts with password reset
import { Password } from "@convex-dev/auth/providers/Password";
import { Resend } from "@convex-dev/auth/providers/Resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      reset: Resend({ apiKey: process.env.RESEND_API_KEY }),
    }),
  ],
});
```

---

## Database Schema (Convex)

### Design Principles

1. **Soft Deletes**: All primary entities have `deletedAt` field
2. **Versioned JSON**: `gearSettings` includes `schemaVersion`
3. **Timestamps**: `createdAt` and `updatedAt` on all entities
4. **File Size Tracking**: For storage cost monitoring

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============ GEAR SETTINGS SCHEMA ============
// Versioned JSON structure for gear settings
const gearSettingsValidator = v.object({
  schemaVersion: v.number(), // Currently 1
  pedals: v.optional(v.array(v.object({
    name: v.string(),
    settings: v.record(v.string(), v.union(v.string(), v.number())),
    order: v.number(),
    enabled: v.boolean(),
  }))),
  synth: v.optional(v.object({
    patch: v.string(),
    bank: v.optional(v.string()),
    settings: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
  })),
  amp: v.optional(v.object({
    name: v.string(),
    channel: v.optional(v.string()),
    settings: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
  })),
  notes: v.optional(v.string()),
});

export default defineSchema({
  // ============ USERS ============
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Soft delete
    deletedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // ============ BANDS ============
  bands: defineTable({
    userId: v.id("users"),
    name: v.string(),
    myInstruments: v.array(v.string()),
    members: v.optional(v.array(v.object({
      name: v.string(),
      instrument: v.optional(v.string()),
      email: v.optional(v.string()),
    }))),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "deletedAt"]),

  // ============ SONGS ============
  songs: defineTable({
    bandId: v.id("bands"),
    title: v.string(),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    durationSeconds: v.optional(v.number()), // For setlist duration calc
    practiceStatus: v.string(), // 'learning' | 'needs_work' | 'performance_ready'
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_band_active", ["bandId", "deletedAt"]),

  // ============ SONG FILES ============
  songFiles: defineTable({
    songId: v.id("songs"),
    storageId: v.id("_storage"),
    fileType: v.string(), // 'audio' | 'video' | 'chart' | 'tab' | 'gp' | 'other'
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.number(), // Required for storage tracking
    mimeType: v.optional(v.string()),
    version: v.number(),
    isPrimary: v.boolean(),
    // Auto-analyzed metadata
    detectedTempo: v.optional(v.number()),
    detectedKey: v.optional(v.string()),
    analysisConfidence: v.optional(v.number()),
    // Waveform data (pre-computed for fast rendering)
    waveformPeaks: v.optional(v.array(v.number())),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_song", ["songId"])
    .index("by_song_active", ["songId", "deletedAt"]),

  // ============ INSTRUMENT PARTS ============
  instrumentParts: defineTable({
    songId: v.id("songs"),
    instrument: v.string(),
    section: v.optional(v.string()),
    gearSettings: v.optional(gearSettingsValidator), // Versioned!
    notes: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  }).index("by_song", ["songId"]),

  // ============ LEARNING PROJECTS ============
  learningProjects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    artistComposer: v.optional(v.string()),
    category: v.string(), // 'classical' | 'cover' | 'original' | 'exercise'
    instrument: v.string(),
    key: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    practiceStatus: v.string(),
    difficulty: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "deletedAt"]),

  learningProjectFiles: defineTable({
    projectId: v.id("learningProjects"),
    storageId: v.id("_storage"),
    fileType: v.string(),
    fileName: v.optional(v.string()),
    fileSize: v.number(),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  // ============ RECORDING PROJECTS ============
  recordingProjects: defineTable({
    userId: v.id("users"),
    bandId: v.optional(v.id("bands")),
    name: v.string(),
    status: v.string(), // 'pre_production' | 'tracking' | 'mixing' | 'mastering' | 'complete'
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "deletedAt"]),

  recordingSongs: defineTable({
    projectId: v.id("recordingProjects"),
    title: v.string(),
    sourceSongId: v.optional(v.id("songs")),
    mixNotes: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  trackingGrid: defineTable({
    recordingSongId: v.id("recordingSongs"),
    instrument: v.string(),
    status: v.string(), // 'not_started' | 'in_progress' | 'needs_redo' | 'complete'
    performer: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_song", ["recordingSongId"]),

  bounces: defineTable({
    recordingSongId: v.id("recordingSongs"),
    versionLabel: v.string(),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    fileSize: v.number(),
    waveformPeaks: v.optional(v.array(v.number())),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_song", ["recordingSongId"]),

  bounceComments: defineTable({
    bounceId: v.id("bounces"),
    userId: v.id("users"),
    timestampSeconds: v.optional(v.number()),
    content: v.string(),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index("by_bounce", ["bounceId"]),

  // ============ SETLISTS ============
  setlists: defineTable({
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    date: v.optional(v.string()),
    venue: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Computed field - updated when items change
    estimatedDurationSeconds: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_band_active", ["bandId", "deletedAt"]),

  setlistItems: defineTable({
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
    position: v.number(),
    gearSnapshot: v.optional(gearSettingsValidator),
    transitionNotes: v.optional(v.string()), // Notes for gear changes
    notes: v.optional(v.string()),
  }).index("by_setlist", ["setlistId"]),

  // ============ PRACTICE SESSIONS ============
  practiceSessions: defineTable({
    userId: v.id("users"),
    date: v.string(),
    durationMinutes: v.optional(v.number()),
    bandId: v.optional(v.id("bands")),
    learningProjectId: v.optional(v.id("learningProjects")),
    songsWorked: v.optional(v.array(v.id("songs"))),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ============ LICKS DATABASE ============
  licks: defineTable({
    userId: v.optional(v.id("users")),
    style: v.string(),
    instrument: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
    tempoSuggestion: v.optional(v.number()),
    alphaTexData: v.optional(v.string()),
    gpFileStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    source: v.string(), // 'user' | 'ai' | 'curated'
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_style", ["style"])
    .index("by_user", ["userId"]),

  dailyLickHistory: defineTable({
    userId: v.id("users"),
    lickId: v.id("licks"),
    shownDate: v.string(),
  }).index("by_user_date", ["userId", "shownDate"]),

  // ============ RATE LIMITING ============
  uploadRateLimits: defineTable({
    userId: v.id("users"),
    uploadCount: v.number(),
    windowStart: v.number(), // Unix timestamp
  }).index("by_user", ["userId"]),

  aiGenerationLimits: defineTable({
    userId: v.id("users"),
    generationCount: v.number(),
    windowStart: v.number(),
  }).index("by_user", ["userId"]),
});
```

---

## File Upload System

### Size Limits & Rate Limiting

```typescript
// convex/files.ts
import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_UPLOADS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Check rate limit before generating upload URL
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;
    const now = Date.now();

    // Check rate limit
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;
      
      if (windowExpired) {
        // Reset window
        await ctx.db.patch(rateLimit._id, {
          uploadCount: 1,
          windowStart: now,
        });
      } else if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
        throw new Error("Upload rate limit exceeded. Try again later.");
      } else {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        userId,
        uploadCount: 1,
        windowStart: now,
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Save file with size validation
export const saveSongFile = mutation({
  args: {
    songId: v.id("songs"),
    storageId: v.id("_storage"),
    fileType: v.string(),
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.number(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE_BYTES) {
      // Delete the uploaded file
      await ctx.storage.delete(args.storageId);
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }

    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) => 
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    const maxVersion = existingFiles.length > 0
      ? Math.max(...existingFiles.map((f) => f.version))
      : 0;

    return await ctx.db.insert("songFiles", {
      ...args,
      version: maxVersion + 1,
      isPrimary: existingFiles.length === 0,
      createdAt: Date.now(),
    });
  },
});
```

### Waveform Pre-computation

```typescript
// convex/waveform.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Action to compute waveform peaks (runs in Node.js environment)
export const computeWaveform = action({
  args: {
    storageId: v.id("_storage"),
    targetTable: v.string(), // 'songFiles' or 'bounces'
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found");

    // Fetch the audio file
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Compute peaks (simplified - in production use proper audio decoding)
    // This would use a library like 'audiowaveform' or decode with Web Audio API
    const peaks = computePeaksFromBuffer(arrayBuffer);

    // Save peaks to database
    await ctx.runMutation(internal.waveform.savePeaks, {
      targetTable: args.targetTable,
      targetId: args.targetId,
      peaks,
    });

    return peaks;
  },
});

export const savePeaks = internalMutation({
  args: {
    targetTable: v.string(),
    targetId: v.string(),
    peaks: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.targetTable === "songFiles") {
      await ctx.db.patch(args.targetId as any, {
        waveformPeaks: args.peaks,
      });
    } else if (args.targetTable === "bounces") {
      await ctx.db.patch(args.targetId as any, {
        waveformPeaks: args.peaks,
      });
    }
  },
});

// Helper function (simplified)
function computePeaksFromBuffer(buffer: ArrayBuffer): number[] {
  // In production, decode audio and compute actual peaks
  // This is a placeholder that returns dummy data
  const numPeaks = 200;
  return Array.from({ length: numPeaks }, () => Math.random());
}
```

---

## Setlist Duration Calculation

```typescript
// convex/setlists.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addSongToSetlist = mutation({
  args: {
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
    position: v.number(),
    gearSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Add the item
    await ctx.db.insert("setlistItems", {
      setlistId: args.setlistId,
      songId: args.songId,
      position: args.position,
      gearSnapshot: args.gearSnapshot,
    });

    // Recalculate setlist duration
    await recalculateSetlistDuration(ctx, args.setlistId);
  },
});

async function recalculateSetlistDuration(
  ctx: any,
  setlistId: any
) {
  const items = await ctx.db
    .query("setlistItems")
    .withIndex("by_setlist", (q: any) => q.eq("setlistId", setlistId))
    .collect();

  let totalSeconds = 0;
  const BUFFER_BETWEEN_SONGS = 30; // 30 seconds between songs

  for (const item of items) {
    const song = await ctx.db.get(item.songId);
    if (song?.durationSeconds) {
      totalSeconds += song.durationSeconds;
    }
  }

  // Add buffer time between songs
  if (items.length > 1) {
    totalSeconds += (items.length - 1) * BUFFER_BETWEEN_SONGS;
  }

  await ctx.db.patch(setlistId, {
    estimatedDurationSeconds: totalSeconds,
    updatedAt: Date.now(),
  });
}

// Query that returns setlist with duration formatted
export const getSetlistWithDuration = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist) return null;

    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Get songs with their data
    const itemsWithSongs = await Promise.all(
      items.map(async (item) => {
        const song = await ctx.db.get(item.songId);
        return { ...item, song };
      })
    );

    // Sort by position
    itemsWithSongs.sort((a, b) => a.position - b.position);

    // Format duration
    const totalSeconds = setlist.estimatedDurationSeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedDuration = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes} min`;

    return {
      ...setlist,
      items: itemsWithSongs,
      formattedDuration,
    };
  },
});
```

---

## Song-Linked Practice Tools

```typescript
// convex/songs.ts - Add method to generate practice click
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
        rootNote: song.key.replace("m", ""), // Strip minor indicator
        isMinor: song.key.includes("m"),
        mode: song.mode,
      } : null,
    };
  },
});
```

---

## Transposition Helper

```typescript
// lib/music/transposition.ts
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#",
  "Ab": "G#", "Bb": "A#", "Cb": "B",
};

export function transpose(chord: string, semitones: number): string {
  // Normalize flats to sharps
  let normalizedChord = chord;
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP)) {
    if (chord.startsWith(flat)) {
      normalizedChord = chord.replace(flat, sharp);
      break;
    }
  }

  // Extract root and quality
  const match = normalizedChord.match(/^([A-G]#?)(.*)$/);
  if (!match) return chord;

  const [, root, quality] = match;
  const rootIndex = NOTES.indexOf(root);
  if (rootIndex === -1) return chord;

  const newIndex = (rootIndex + semitones + 12) % 12;
  return NOTES[newIndex] + quality;
}

export function transposeProgression(
  chords: string[],
  fromKey: string,
  toKey: string
): string[] {
  const fromIndex = NOTES.indexOf(fromKey.replace("m", ""));
  const toIndex = NOTES.indexOf(toKey.replace("m", ""));
  const semitones = toIndex - fromIndex;

  return chords.map((chord) => transpose(chord, semitones));
}

// Example usage:
// transposeProgression(["E", "A", "B", "E"], "E", "Eb")
// Returns: ["Eb", "Ab", "Bb", "Eb"]
```

---

## Daily Lick: AI Generation with Rate Limiting

```typescript
// convex/licks.ts
import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const MAX_AI_GENERATIONS_PER_DAY = 5;
const AI_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Get daily lick - prefers curated, falls back to random
export const getDailyLick = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;
    const today = new Date().toISOString().split("T")[0];

    // Check if we already showed a lick today
    const history = await ctx.db
      .query("dailyLickHistory")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId as any).eq("shownDate", today)
      )
      .unique();

    if (history) {
      return await ctx.db.get(history.lickId);
    }

    // Get a random curated lick
    const licks = await ctx.db
      .query("licks")
      .filter((q) => q.eq(q.field("source"), "curated"))
      .collect();

    if (licks.length === 0) return null;

    const randomLick = licks[Math.floor(Math.random() * licks.length)];

    // Record that we showed this lick
    await ctx.db.insert("dailyLickHistory", {
      userId: userId as any,
      lickId: randomLick._id,
      shownDate: today,
    });

    return randomLick;
  },
});

// Generate custom lick with AI (rate limited)
export const generateAiLick = action({
  args: {
    style: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Check rate limit
    const canGenerate = await ctx.runMutation(internal.licks.checkAiRateLimit, {
      userId: userId as any,
    });

    if (!canGenerate) {
      throw new Error("Daily AI generation limit reached. Try again tomorrow.");
    }

    // Call Claude API to generate lick
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate a ${args.style} guitar lick in alphaTex format.
              Difficulty: ${args.difficulty}/5
              Key: ${args.key || "A"}
              
              Return ONLY the alphaTex notation, no explanation.
              Example format:
              \\title "Blues Lick"
              \\tempo 90
              .
              :8 5.3 7.3 5.3 7.4 | 5.4 7.4 5.4 :4 5.3`,
          },
        ],
      }),
    });

    const data = await response.json();
    const alphaTexData = data.content[0].text;

    // Save the generated lick
    const lickId = await ctx.runMutation(internal.licks.saveGeneratedLick, {
      userId: userId as any,
      style: args.style,
      difficulty: args.difficulty,
      key: args.key,
      alphaTexData,
    });

    return { lickId, alphaTexData };
  },
});

export const checkAiRateLimit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const limit = await ctx.db
      .query("aiGenerationLimits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (limit) {
      const windowExpired = now - limit.windowStart > AI_RATE_LIMIT_WINDOW_MS;

      if (windowExpired) {
        await ctx.db.patch(limit._id, {
          generationCount: 1,
          windowStart: now,
        });
        return true;
      } else if (limit.generationCount >= MAX_AI_GENERATIONS_PER_DAY) {
        return false;
      } else {
        await ctx.db.patch(limit._id, {
          generationCount: limit.generationCount + 1,
        });
        return true;
      }
    } else {
      await ctx.db.insert("aiGenerationLimits", {
        userId: args.userId,
        generationCount: 1,
        windowStart: now,
      });
      return true;
    }
  },
});

export const saveGeneratedLick = internalMutation({
  args: {
    userId: v.id("users"),
    style: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
    alphaTexData: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("licks", {
      userId: args.userId,
      style: args.style,
      instrument: "guitar",
      difficulty: args.difficulty,
      key: args.key,
      alphaTexData: args.alphaTexData,
      source: "ai",
      createdAt: Date.now(),
    });
  },
});
```

---

## AlphaTab Integration

### Lazy Loading Strategy

```typescript
// components/tab/AlphaTabViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

interface AlphaTabViewerProps {
  alphaTexData?: string;
  gpFileUrl?: string;
  onReady?: () => void;
}

// Lazy load AlphaTab only when component mounts
export function AlphaTabViewer({ alphaTexData, gpFileUrl, onReady }: AlphaTabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAlphaTab() {
      try {
        // Dynamic import - only loads when needed
        const { AlphaTabApi, Settings } = await import("@coderline/alphatab");

        if (!mounted || !containerRef.current) return;

        const settings = new Settings();
        settings.core.fontDirectory = "/fonts/bravura/";
        settings.player.enablePlayer = true;
        settings.player.soundFont = "/soundfonts/sonivox.sf2";
        settings.display.staveProfile = 1; // Tab

        apiRef.current = new AlphaTabApi(containerRef.current, settings);

        apiRef.current.renderStarted.on(() => {
          setIsLoading(true);
        });

        apiRef.current.renderFinished.on(() => {
          setIsLoading(false);
          onReady?.();
        });

        apiRef.current.error.on((e: any) => {
          setError(e.message || "Failed to load tab");
          setIsLoading(false);
        });

        // Load content
        if (alphaTexData) {
          apiRef.current.tex(alphaTexData);
        } else if (gpFileUrl) {
          apiRef.current.load(gpFileUrl);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load AlphaTab library");
          setIsLoading(false);
        }
      }
    }

    loadAlphaTab();

    return () => {
      mounted = false;
      apiRef.current?.destroy();
    };
  }, [alphaTexData, gpFileUrl, onReady]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}
      <div ref={containerRef} className="min-h-[200px]" />
    </div>
  );
}
```

---

## Error Handling Strategy

### Global Error Boundary

```typescript
// components/ErrorBoundary.tsx
"use client";

import { Component, ReactNode } from "react";
import posthog from "posthog-js";

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
    posthog.capture("error_boundary_caught", {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We've been notified and are looking into it.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Mutation Error Handling with Retry

```typescript
// hooks/useMutationWithRetry.ts
import { useMutation } from "convex/react";
import { useState, useCallback } from "react";
import posthog from "posthog-js";

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

export function useMutationWithRetry<T extends (...args: any[]) => any>(
  mutation: T,
  options: RetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;
  const baseMutation = useMutation(mutation);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await baseMutation(...args);
          setIsLoading(false);
          return result;
        } catch (err) {
          lastError = err as Error;

          // Don't retry on validation errors
          if (lastError.message.includes("validation")) {
            break;
          }

          // Wait before retrying
          if (attempt < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * (attempt + 1))
            );
          }
        }
      }

      // All retries failed
      setError(lastError);
      setIsLoading(false);

      posthog.capture("mutation_failed", { error: lastError?.message });
      onError?.(lastError!);
      
      throw lastError;
    },
    [baseMutation, maxRetries, retryDelay, onError]
  );

  return { execute, isLoading, error };
}
```

### File Upload Error Handling

```typescript
// hooks/useFileUpload.ts
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useFileUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Validate file size client-side first
        const MAX_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          throw new Error(`File too large. Maximum size is 100MB.`);
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload with progress tracking
        const xhr = new XMLHttpRequest();

        const storageId = await new Promise<string>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setState((s) => ({ ...s, progress: (e.loaded / e.total) * 100 }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.storageId);
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setState({ isUploading: false, progress: 100, error: null });
        return storageId;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setState({ isUploading: false, progress: 0, error });
        return null;
      }
    },
    [generateUploadUrl]
  );

  return { ...state, upload };
}
```

---

## Data Export

```typescript
// convex/export.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const exportUserData = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Gather all user data
    const [
      user,
      bands,
      learningProjects,
      recordingProjects,
      practiceSessions,
    ] = await Promise.all([
      ctx.runQuery(internal.export.getUser, { userId }),
      ctx.runQuery(internal.export.getUserBands, { userId }),
      ctx.runQuery(internal.export.getUserLearningProjects, { userId }),
      ctx.runQuery(internal.export.getUserRecordingProjects, { userId }),
      ctx.runQuery(internal.export.getUserPracticeSessions, { userId }),
    ]);

    // Get songs for each band
    const bandsWithSongs = await Promise.all(
      bands.map(async (band: any) => ({
        ...band,
        songs: await ctx.runQuery(internal.export.getBandSongs, {
          bandId: band._id,
        }),
      }))
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      bands: bandsWithSongs,
      learningProjects,
      recordingProjects,
      practiceSessions,
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Store as a file and return URL
    const blob = new Blob([jsonString], { type: "application/json" });
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);

    // Schedule deletion of export file after 1 hour
    await ctx.scheduler.runAfter(60 * 60 * 1000, internal.export.deleteExport, {
      storageId,
    });

    return url;
  },
});
```

---

## Testing Strategy

### Convex Function Tests

```typescript
// convex/tests/songs.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("songs", () => {
  test("create song", async () => {
    const t = convexTest(schema);

    // Create a user and band first
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        createdAt: Date.now(),
      });
    });

    const bandId = await t.run(async (ctx) => {
      return await ctx.db.insert("bands", {
        userId,
        name: "Test Band",
        myInstruments: ["guitar"],
        createdAt: Date.now(),
      });
    });

    // Create song
    const songId = await t.mutation(api.songs.create, {
      bandId,
      title: "Test Song",
      key: "E",
      tempo: 120,
      practiceStatus: "learning",
    });

    expect(songId).toBeDefined();

    // Verify song was created
    const song = await t.run(async (ctx) => {
      return await ctx.db.get(songId);
    });

    expect(song?.title).toBe("Test Song");
    expect(song?.key).toBe("E");
    expect(song?.deletedAt).toBeUndefined();
  });

  test("soft delete song", async () => {
    const t = convexTest(schema);

    // Setup...
    const songId = await setupTestSong(t);

    // Delete song
    await t.mutation(api.songs.softDelete, { songId });

    // Verify soft delete
    const song = await t.run(async (ctx) => {
      return await ctx.db.get(songId);
    });

    expect(song?.deletedAt).toBeDefined();
  });
});
```

### Component Tests

```typescript
// __tests__/components/SongCard.test.tsx
import { render, screen } from "@testing-library/react";
import { ConvexProvider } from "convex/react";
import { vi } from "vitest";
import { SongCard } from "@/components/songs/SongCard";

// Mock Convex client
const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
};

describe("SongCard", () => {
  it("displays song information", () => {
    const song = {
      _id: "123",
      title: "Test Song",
      key: "E",
      tempo: 120,
      practiceStatus: "learning",
    };

    render(
      <ConvexProvider client={mockConvexClient as any}>
        <SongCard song={song} />
      </ConvexProvider>
    );

    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("120 BPM")).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("user can sign up", async ({ page }) => {
    await page.goto("/sign-up");

    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "SecurePassword123!");
    await page.fill('[name="confirmPassword"]', "SecurePassword123!");

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("user can sign in", async ({ page }) => {
    await page.goto("/sign-in");

    await page.fill('[name="email"]', "existing@example.com");
    await page.fill('[name="password"]', "ExistingPassword123!");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
  });
});
```

---

## Environment Variables

```bash
# .env.local

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Convex Auth (generate with: openssl rand -base64 32)
CONVEX_AUTH_SECRET=your-secret-here

# Email (for password reset - optional for MVP)
# RESEND_API_KEY=re_xxxxx

# Audio Analysis APIs (optional)
# GETSONGBPM_API_KEY=xxxxx
# SOUNDCHARTS_API_KEY=xxxxx

# AI Generation
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Error Tracking & Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Site URL (for auth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── bands/
│   │   ├── learning/
│   │   ├── recording/
│   │   ├── setlists/
│   │   ├── training/
│   │   ├── practice-log/
│   │   └── settings/
│   │       └── export/page.tsx
│   └── api/
├── components/
│   ├── ui/                    # shadcn components
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   ├── SignUpForm.tsx
│   │   └── ResetPasswordForm.tsx
│   ├── audio/
│   │   ├── WaveformPlayer.tsx
│   │   ├── AudioAnalyzer.tsx
│   │   └── FileUploader.tsx
│   ├── tab/
│   │   └── AlphaTabViewer.tsx  # Lazy loaded
│   ├── training/
│   │   ├── DronePlayer.tsx
│   │   ├── ChordProgPlayer.tsx
│   │   ├── Metronome.tsx
│   │   └── DailyLick.tsx
│   ├── recording/
│   │   ├── TrackingGrid.tsx
│   │   ├── BouncePlayer.tsx
│   │   └── BounceComments.tsx
│   └── ErrorBoundary.tsx
├── convex/
│   ├── schema.ts
│   ├── auth.ts
│   ├── auth.config.ts
│   ├── users.ts
│   ├── bands.ts
│   ├── songs.ts
│   ├── files.ts
│   ├── waveform.ts
│   ├── learningProjects.ts
│   ├── recordingProjects.ts
│   ├── bounces.ts
│   ├── setlists.ts
│   ├── practiceSessions.ts
│   ├── licks.ts
│   ├── export.ts
│   └── http.ts
├── hooks/
│   ├── useFileUpload.ts
│   ├── useMutationWithRetry.ts
│   └── useAuth.ts
├── lib/
│   ├── music/
│   │   └── transposition.ts
│   └── audio/
│       └── analyzer.ts
├── public/
│   ├── fonts/bravura/         # AlphaTab fonts
│   └── soundfonts/            # AlphaTab soundfonts
├── __tests__/
│   └── components/
├── e2e/
│   └── auth.spec.ts
└── lib/
    └── posthog.ts
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [x] Project setup (Next.js, Convex)
- [ ] Convex Auth with email/password
- [ ] User CRUD with soft deletes
- [ ] Band CRUD with soft deletes
- [ ] Basic error boundary
- [ ] PostHog integration

### Phase 2: Core Features (Week 3-4)
- [ ] Song CRUD with file uploads
- [ ] File size limits & rate limiting
- [ ] Learning Projects
- [ ] Gear settings (versioned JSON)
- [ ] Practice session logging

### Phase 3: Audio & Analysis (Week 5-6)
- [ ] Waveform pre-computation on upload
- [ ] wavesurfer.js integration
- [ ] Essentia.js audio analysis
- [ ] Song duration detection

### Phase 4: Tab & Training (Week 7-8)
- [ ] AlphaTab lazy loading
- [ ] Metronome with song linking
- [ ] Drone player
- [ ] Chord progression player
- [ ] Daily lick (curated database)
- [ ] AI lick generation (rate limited)

### Phase 5: Recording & Setlists (Week 9-10)
- [ ] Recording project management
- [ ] Tracking grid
- [ ] Bounce uploads + timestamped comments
- [ ] Setlist builder with duration calc
- [ ] Transposition helper

### Phase 6: Polish & Testing (Week 11-12)
- [ ] Data export feature
- [ ] Convex function tests
- [ ] Component tests
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Mobile responsiveness

---

## CLAUDE.md

```markdown
# BandBrain

Musician practice and recording management app.

## Tech Stack
- Next.js 14+ (App Router, TypeScript)
- Convex (Database, Auth, File Storage)
- Tailwind CSS + shadcn/ui
- AlphaTab (tab rendering - lazy loaded)
- wavesurfer.js (waveform visualization)
- PostHog (error tracking & analytics)
- Vercel deployment

## Key Commands
- `npm run dev` - Start Next.js dev server
- `npx convex dev` - Start Convex dev server (separate terminal)
- `npx convex deploy` - Deploy Convex functions
- `npm run test` - Run Vitest tests
- `npm run test:e2e` - Run Playwright E2E tests

## Database
Schema in `convex/schema.ts`. All entities have soft deletes (`deletedAt` field).
Gear settings use versioned JSON with `schemaVersion` field.

## File Storage
Uses Convex built-in storage. Max file size: 100MB.
Rate limit: 50 uploads per hour per user.
Waveform peaks are pre-computed on upload.

## Authentication
Convex Auth with Password provider. No external auth service.
- Sign up/in: email + password
- Password reset: requires Resend API key (optional for MVP)

## Code Conventions
- Use server components by default
- Lazy load AlphaTab only on pages that need it
- All mutations should use soft deletes
- Wrap risky operations in try/catch, report to PostHog
- File uploads must validate size client-side AND server-side

## Testing
- Convex functions: `convex/tests/` with convex-test
- Components: `__tests__/` with Vitest + Testing Library
- E2E: `e2e/` with Playwright
```

---

*Document Version: 3.0*  
*Created: January 2026*  
*App Name: BandBrain*
