import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============ GEAR SETTINGS SCHEMA ============
// Versioned JSON structure for gear settings
const gearSettingsValidator = v.object({
  schemaVersion: v.number(), // Currently 1
  pedals: v.optional(
    v.array(
      v.object({
        name: v.string(),
        settings: v.record(v.string(), v.union(v.string(), v.number())),
        order: v.number(),
        enabled: v.boolean(),
      })
    )
  ),
  synth: v.optional(
    v.object({
      patch: v.string(),
      bank: v.optional(v.string()),
      settings: v.optional(
        v.record(v.string(), v.union(v.string(), v.number()))
      ),
    })
  ),
  amp: v.optional(
    v.object({
      name: v.string(),
      channel: v.optional(v.string()),
      settings: v.optional(
        v.record(v.string(), v.union(v.string(), v.number()))
      ),
    })
  ),
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
    members: v.optional(
      v.array(
        v.object({
          name: v.string(),
          instrument: v.optional(v.string()),
          email: v.optional(v.string()),
        })
      )
    ),
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

export { gearSettingsValidator };
