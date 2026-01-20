# Database Schema (Convex)

> **Related:** [PROGRESS.md](./PROGRESS.md) | [README.md](./README.md)

## Design Principles

1. **Soft Deletes**: All primary entities have `deletedAt` field
2. **Timestamps**: `createdAt` and `updatedAt` on all entities
3. **File Size Tracking**: For storage cost monitoring
4. **Per-User Storage Limits**: 2GB per user, tracked in users table
5. **Collaborative Bands**: Multiple users can belong to a band with equal permissions
6. **Section-Level Gear Settings**: Gear configurations are stored per song section, not per song
7. **Visual Knob Settings**: Gear knobs store position (0-1 range representing dial angle) with editable labels
8. **External Resource Links**: Support both uploaded files and external URLs (Dropbox, YouTube, etc.)
9. **Computed Gear Deltas**: Setlist gear changes between songs are computed at display time, not stored

---

## Full Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============ KNOB SETTINGS SCHEMA ============
// Visual knob dial system - mimics real hardware knobs
// Position is 0-1 range (0 = 7 o'clock, 1 = 5 o'clock like real knobs)
const knobValidator = v.object({
  label: v.string(), // User-defined label, e.g., "Gain", "Tone", "Drive"
  position: v.number(), // 0-1 range representing dial position
});

// User-defined gear piece (pedal, synth, amp, etc.)
const gearPieceValidator = v.object({
  name: v.string(), // e.g., "Tube Screamer", "Sub 37", "Deluxe Reverb"
  type: v.string(), // 'pedal' | 'synth' | 'amp' | 'other'
  enabled: v.boolean(), // For pedals: on/off state
  knobs: v.array(knobValidator), // User-defined knobs for this piece
  // Synth-specific fields
  patch: v.optional(v.string()), // e.g., "16-16", "E:12"
  patchName: v.optional(v.string()), // e.g., "ArcadeArp~"
  // Only store knob overrides from patch default (for synths)
  isOverride: v.optional(v.boolean()), // True if knob differs from patch default
  notes: v.optional(v.string()),
});

// Section-level gear settings
const gearSettingsValidator = v.object({
  gear: v.array(gearPieceValidator), // All gear pieces in signal chain order
  notes: v.optional(v.string()), // General notes for this section
});

export default defineSchema({
  // ============ USERS ============
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Storage tracking (2GB = 2147483648 bytes limit)
    storageUsedBytes: v.optional(v.number()), // Defaults to 0
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // ============ BANDS ============
  bands: defineTable({
    createdBy: v.id("users"), // Original creator
    name: v.string(),
    // Shareable invite code (e.g., "ROCK2024" or UUID)
    inviteCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_invite_code", ["inviteCode"])
    .index("by_created_by", ["createdBy"]),

  // ============ BAND MEMBERSHIPS ============
  // Tracks which users belong to which bands
  // All members have equal permissions
  bandMemberships: defineTable({
    bandId: v.id("bands"),
    userId: v.id("users"),
    // Instruments this user plays in this band
    instruments: v.array(v.string()), // e.g., ["guitar", "synth"]
    joinedAt: v.number(),
    // Soft delete (for leaving band)
    leftAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_band_user", ["bandId", "userId"])
    .index("by_band_active", ["bandId", "leftAt"]),

  // ============ SONGS ============
  songs: defineTable({
    bandId: v.id("bands"),
    title: v.string(),
    key: v.optional(v.string()),
    mode: v.optional(v.string()), // e.g., "Mixolydian", "Dorian", "Major", "Minor"
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    durationSeconds: v.optional(v.number()), // For setlist duration calc
    practiceStatus: v.string(), // 'new' | 'learning' | 'solid' | 'performance_ready'
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_band_active", ["bandId", "deletedAt"]),

  // ============ SONG SECTIONS ============
  // Captures gear settings per section of a song (intro, verse, chorus, solo, etc.)
  songSections: defineTable({
    songId: v.id("songs"),
    instrument: v.string(), // e.g., "guitar", "synth", "bass", "drums"
    name: v.string(), // e.g., "Intro", "Verse 1", "Chorus", "Bridge", "Solo", "Outro"
    position: v.number(), // Order within the song (0, 1, 2, ...)
    gearSettings: v.optional(gearSettingsValidator),
    notes: v.optional(v.string()), // Performance notes
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_song", ["songId"])
    .index("by_song_instrument", ["songId", "instrument"])
    .index("by_song_active", ["songId", "deletedAt"]),

  // ============ SONG FILES ============
  // Supports both uploaded files (storageId) and external URLs (externalUrl)
  songFiles: defineTable({
    songId: v.id("songs"),
    storageId: v.optional(v.id("_storage")), // For uploaded files
    externalUrl: v.optional(v.string()), // For Dropbox, YouTube, etc.
    externalService: v.optional(v.string()), // e.g., "dropbox", "youtube"
    fileType: v.string(), // 'audio' | 'video' | 'chart' | 'tab' | 'gp' | 'stem' | 'other'
    variantLabel: v.optional(v.string()), // e.g., "Live Session", "Instrumental"
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    version: v.number(),
    isPrimary: v.boolean(),
    // Auto-analyzed metadata
    detectedTempo: v.optional(v.number()),
    detectedKey: v.optional(v.string()),
    analysisConfidence: v.optional(v.number()),
    // Waveform data (pre-computed)
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
    role: v.optional(v.string()), // e.g., "lead", "rhythm", "pad"
    difficulty: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  }).index("by_song", ["songId"]),

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
    // Starting gear settings BEFORE the first song
    startingGearSettings: v.optional(v.object({
      guitar: v.optional(gearSettingsValidator),
      synth: v.optional(gearSettingsValidator),
      bass: v.optional(gearSettingsValidator),
      drums: v.optional(gearSettingsValidator),
      other: v.optional(v.record(v.string(), gearSettingsValidator)),
    })),
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
    transitionNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_setlist", ["setlistId"]),

  // ============ PRACTICE SESSIONS ============
  practiceSessions: defineTable({
    userId: v.id("users"),
    date: v.string(),
    durationMinutes: v.optional(v.number()),
    bandId: v.optional(v.id("bands")),
    songsWorked: v.optional(v.array(v.id("songs"))),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ============ RATE LIMITING ============
  uploadRateLimits: defineTable({
    userId: v.id("users"),
    uploadCount: v.number(),
    windowStart: v.number(),
  }).index("by_user", ["userId"]),
});
```

---

## Table Relationships

```
users
  └── bandMemberships (many)
  └── recordingProjects (many)
  └── practiceSessions (many)
  └── bounceComments (many)
  └── uploadRateLimits (one)

bands
  └── bandMemberships (many)
  └── songs (many)
  └── setlists (many)
  └── recordingProjects (many)

songs
  └── songFiles (many)
  └── songSections (many)
  └── instrumentParts (many)
  └── setlistItems (many)
  └── recordingSongs (many)

recordingProjects
  └── recordingSongs (many)

recordingSongs
  └── trackingGrid (many)
  └── bounces (many)

bounces
  └── bounceComments (many)

setlists
  └── setlistItems (many)
```

---

## Common Query Patterns

### Get active records (with soft delete)
```typescript
const activeSongs = await ctx.db
  .query("songs")
  .withIndex("by_band_active", q =>
    q.eq("bandId", bandId).eq("deletedAt", undefined)
  )
  .collect();
```

### Get user's bands (via membership)
```typescript
const memberships = await ctx.db
  .query("bandMemberships")
  .withIndex("by_user", q => q.eq("userId", userId))
  .filter(q => q.eq(q.field("leftAt"), undefined))
  .collect();

const bands = await Promise.all(
  memberships.map(m => ctx.db.get(m.bandId))
);
```

### Soft delete
```typescript
await ctx.db.patch(songId, {
  deletedAt: Date.now(),
  updatedAt: Date.now(),
});
```
