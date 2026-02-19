import { v } from "convex/values";
import { mutation, internalMutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============ HELPERS ============

async function getCurrentUserId(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

// ============ MUTATIONS ============

/**
 * Save waveform peaks and duration for a song file
 * Called from client after computing peaks using Web Audio API
 *
 * Returns detected values and current song values so client can show
 * a confirmation dialog when there are conflicts.
 */
export const saveSongFileAnalysis = mutation({
  args: {
    fileId: v.id("songFiles"),
    waveformPeaks: v.array(v.number()),
    durationSeconds: v.optional(v.number()),
    detectedTempo: v.optional(v.number()),
    detectedKey: v.optional(v.string()),
    analysisConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Get the file
    const file = await ctx.db.get(args.fileId);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Verify access via song ownership
    const song = await ctx.db.get(file.songId);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    const band = await ctx.db.get(song.bandId);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    if (band.createdBy !== userId) {
      throw new Error("Not authorized to access this song");
    }

    // Update the file with waveform and analysis data
    const fileUpdates: Partial<{
      waveformPeaks: number[];
      detectedTempo: number;
      detectedKey: string;
      analysisConfidence: number;
      durationSeconds: number;
    }> = {
      waveformPeaks: args.waveformPeaks,
    };

    if (args.detectedTempo !== undefined) {
      fileUpdates.detectedTempo = args.detectedTempo;
    }
    if (args.detectedKey !== undefined) {
      fileUpdates.detectedKey = args.detectedKey;
    }
    if (args.analysisConfidence !== undefined) {
      fileUpdates.analysisConfidence = args.analysisConfidence;
    }
    if (args.durationSeconds !== undefined) {
      fileUpdates.durationSeconds = args.durationSeconds;
    }

    await ctx.db.patch(args.fileId, fileUpdates);

    // Return info for client to decide whether to show confirmation dialog
    // Only relevant if this is the primary audio file
    if (file.isPrimary) {
      const hasConflict =
        (args.durationSeconds !== undefined && song.durationSeconds !== undefined && song.durationSeconds !== Math.round(args.durationSeconds)) ||
        (args.detectedTempo !== undefined && song.tempo !== undefined && song.tempo !== args.detectedTempo) ||
        (args.detectedKey !== undefined && song.key !== undefined && song.key !== args.detectedKey);

      const songHasNoMetadata =
        song.durationSeconds === undefined &&
        song.tempo === undefined &&
        song.key === undefined;

      return {
        fileId: args.fileId,
        songId: song._id,
        isPrimary: true,
        hasConflict,
        songHasNoMetadata,
        detected: {
          durationSeconds: args.durationSeconds ? Math.round(args.durationSeconds) : undefined,
          tempo: args.detectedTempo,
          key: args.detectedKey,
        },
        current: {
          durationSeconds: song.durationSeconds,
          tempo: song.tempo,
          key: song.key,
        },
      };
    }

    return {
      fileId: args.fileId,
      songId: song._id,
      isPrimary: false,
      hasConflict: false,
      songHasNoMetadata: false,
      detected: {
        durationSeconds: args.durationSeconds ? Math.round(args.durationSeconds) : undefined,
        tempo: args.detectedTempo,
        key: args.detectedKey,
      },
      current: {
        durationSeconds: song.durationSeconds,
        tempo: song.tempo,
        key: song.key,
      },
    };
  },
});

/**
 * Apply detected audio metadata to a song
 * Called after user confirms they want to overwrite existing values
 */
export const applySongMetadata = mutation({
  args: {
    songId: v.id("songs"),
    durationSeconds: v.optional(v.number()),
    tempo: v.optional(v.number()),
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Get the song
    const song = await ctx.db.get(args.songId);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify access via band ownership
    const band = await ctx.db.get(song.bandId);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    if (band.createdBy !== userId) {
      throw new Error("Not authorized to access this song");
    }

    // Build updates
    const updates: Partial<{
      durationSeconds: number;
      tempo: number;
      key: string;
      updatedAt: number;
    }> = {};

    if (args.durationSeconds !== undefined) {
      updates.durationSeconds = Math.round(args.durationSeconds);
    }
    if (args.tempo !== undefined) {
      updates.tempo = args.tempo;
    }
    if (args.key !== undefined) {
      updates.key = args.key;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(args.songId, updates);
    }

    return args.songId;
  },
});

/**
 * Internal mutation to save peaks (for use from actions)
 */
export const savePeaks = internalMutation({
  args: {
    targetTable: v.string(),
    targetId: v.string(),
    peaks: v.array(v.number()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.targetTable === "songFiles") {
      await ctx.db.patch(args.targetId as Id<"songFiles">, {
        waveformPeaks: args.peaks,
      });

      // If duration was provided, try to update the parent song
      if (args.durationSeconds) {
        const file = await ctx.db.get(args.targetId as Id<"songFiles">);
        if (file) {
          const song = await ctx.db.get(file.songId);
          if (song && !song.durationSeconds) {
            await ctx.db.patch(song._id, {
              durationSeconds: Math.round(args.durationSeconds),
              updatedAt: Date.now(),
            });
          }
        }
      }
    } else if (args.targetTable === "bounces") {
      await ctx.db.patch(args.targetId as Id<"bounces">, {
        waveformPeaks: args.peaks,
      });
    }
  },
});

/**
 * Update song duration manually
 */
export const updateSongDuration = mutation({
  args: {
    songId: v.id("songs"),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const song = await ctx.db.get(args.songId);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    const band = await ctx.db.get(song.bandId);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    if (band.createdBy !== userId) {
      throw new Error("Not authorized to access this song");
    }

    await ctx.db.patch(args.songId, {
      durationSeconds: Math.round(args.durationSeconds),
      updatedAt: Date.now(),
    });

    return args.songId;
  },
});
