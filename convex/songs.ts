import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============ CONSTANTS ============
export const PRACTICE_STATUSES = [
  "new",
  "learning",
  "solid",
  "performance_ready",
] as const;

export type PracticeStatus = (typeof PRACTICE_STATUSES)[number];

// Common musical keys
export const MUSICAL_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;

// Common modes
export const MODES = [
  "Major",
  "Minor",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
] as const;

// Common time signatures
export const TIME_SIGNATURES = [
  "4/4",
  "3/4",
  "6/8",
  "2/4",
  "5/4",
  "7/8",
  "12/8",
] as const;

// ============ HELPERS ============

async function getCurrentUserId(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

async function getQueryUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  return userId;
}

/**
 * Verify user owns the band
 */
async function verifyBandOwnership(
  ctx: QueryCtx | MutationCtx,
  bandId: Id<"bands">,
  userId: Id<"users">
): Promise<boolean> {
  const band = await ctx.db.get(bandId);
  if (!band || band.deletedAt) {
    return false;
  }
  return band.createdBy === userId;
}

// ============ QUERIES ============

/**
 * List all active songs for a band
 */
export const listByBand = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, args.bandId, userId);
    if (!isMember) {
      return [];
    }

    const songs = await ctx.db
      .query("songs")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", args.bandId).eq("deletedAt", undefined)
      )
      .collect();

    // Get file counts and type flags for each song
    const songsWithFiles = await Promise.all(
      songs.map(async (song) => {
        const files = await ctx.db
          .query("songFiles")
          .withIndex("by_song_active", (q) =>
            q.eq("songId", song._id).eq("deletedAt", undefined)
          )
          .collect();

        const fileTypes = new Set(files.map((f) => f.fileType));

        return {
          ...song,
          fileCount: files.length,
          hasAudio: fileTypes.has("audio") || fileTypes.has("stem"),
          hasVideo: fileTypes.has("video"),
          hasChart: fileTypes.has("chart"),
          hasTab: fileTypes.has("tab") || fileTypes.has("gp"),
        };
      })
    );

    // Sort by title alphabetically
    return songsWithFiles.sort((a, b) => a.title.localeCompare(b.title));
  },
});

/**
 * Get a single song by ID
 */
export const get = query({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return null;
    }

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      return null;
    }

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, song.bandId, userId);
    if (!isMember) {
      return null;
    }

    // Get files for the song
    const files = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", song._id).eq("deletedAt", undefined)
      )
      .collect();

    // Get band info
    const band = await ctx.db.get(song.bandId);

    return {
      ...song,
      bandName: band?.name,
      files,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Create a new song
 */
export const create = mutation({
  args: {
    bandId: v.id("bands"),
    title: v.string(),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, args.bandId, userId);
    if (!isMember) {
      throw new Error("Not authorized to access this band");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Song title is required");
    }

    // Validate tempo if provided
    if (args.tempo !== undefined && (args.tempo < 1 || args.tempo > 400)) {
      throw new Error("Tempo must be between 1 and 400 BPM");
    }

    const now = Date.now();

    const songId = await ctx.db.insert("songs", {
      bandId: args.bandId,
      title: args.title.trim(),
      key: args.key,
      mode: args.mode,
      tempo: args.tempo,
      timeSignature: args.timeSignature,
      durationSeconds: args.durationSeconds,
      practiceStatus: "new",
      notes: args.notes?.trim(),
      createdAt: now,
    });

    return songId;
  },
});

/**
 * Update a song
 */
export const update = mutation({
  args: {
    id: v.id("songs"),
    title: v.optional(v.string()),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, song.bandId, userId);
    if (!isMember) {
      throw new Error("Not authorized to access this band");
    }

    // Build update object
    const updates: Partial<{
      title: string;
      key: string;
      mode: string;
      tempo: number;
      timeSignature: string;
      durationSeconds: number;
      notes: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      if (!args.title.trim()) {
        throw new Error("Song title is required");
      }
      updates.title = args.title.trim();
    }

    if (args.key !== undefined) updates.key = args.key;
    if (args.mode !== undefined) updates.mode = args.mode;
    if (args.tempo !== undefined) {
      if (args.tempo < 1 || args.tempo > 400) {
        throw new Error("Tempo must be between 1 and 400 BPM");
      }
      updates.tempo = args.tempo;
    }
    if (args.timeSignature !== undefined) updates.timeSignature = args.timeSignature;
    if (args.durationSeconds !== undefined) updates.durationSeconds = args.durationSeconds;
    if (args.notes !== undefined) updates.notes = args.notes.trim();

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

/**
 * Update practice status
 */
export const updatePracticeStatus = mutation({
  args: {
    id: v.id("songs"),
    practiceStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, song.bandId, userId);
    if (!isMember) {
      throw new Error("Not authorized to access this band");
    }

    // Validate practice status
    if (!PRACTICE_STATUSES.includes(args.practiceStatus as PracticeStatus)) {
      throw new Error(
        `Invalid practice status. Must be one of: ${PRACTICE_STATUSES.join(", ")}`
      );
    }

    await ctx.db.patch(args.id, {
      practiceStatus: args.practiceStatus,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Soft delete a song
 */
export const softDelete = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify band membership
    const isMember = await verifyBandOwnership(ctx, song.bandId, userId);
    if (!isMember) {
      throw new Error("Not authorized to access this band");
    }

    const now = Date.now();

    // Soft delete the song
    await ctx.db.patch(args.id, {
      deletedAt: now,
      updatedAt: now,
    });

    // Also soft delete all associated files
    const files = await ctx.db
      .query("songFiles")
      .withIndex("by_song", (q) => q.eq("songId", args.id))
      .collect();

    for (const file of files) {
      if (!file.deletedAt) {
        await ctx.db.patch(file._id, {
          deletedAt: now,
        });
      }
    }

    // Also soft delete all associated sections
    const sections = await ctx.db
      .query("songSections")
      .withIndex("by_song", (q) => q.eq("songId", args.id))
      .collect();

    for (const section of sections) {
      if (!section.deletedAt) {
        await ctx.db.patch(section._id, {
          deletedAt: now,
          updatedAt: now,
        });
      }
    }

    return args.id;
  },
});
