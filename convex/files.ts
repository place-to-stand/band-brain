import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============ CONSTANTS ============

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_USER_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_UPLOADS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// File types supported by the system
export const FILE_TYPES = [
  "audio",
  "video",
  "chart",
  "tab",
  "gp",
  "stem",
  "other",
] as const;

export type FileType = (typeof FILE_TYPES)[number];

// External services for linked files
export const EXTERNAL_SERVICES = [
  "dropbox",
  "youtube",
  "bandcamp",
  "google_drive",
  "other",
] as const;

export type ExternalService = (typeof EXTERNAL_SERVICES)[number];

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
 * Verify user owns the band that owns the song
 */
async function verifySongAccess(
  ctx: QueryCtx | MutationCtx,
  songId: Id<"songs">,
  userId: Id<"users">
): Promise<{ song: Doc<"songs">; bandId: Id<"bands"> }> {
  const song = await ctx.db.get(songId);
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

  return { song, bandId: song.bandId };
}

/**
 * Detect external service from URL
 */
function detectExternalService(url: string): ExternalService {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("dropbox.com")) return "dropbox";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be"))
    return "youtube";
  if (urlLower.includes("bandcamp.com")) return "bandcamp";
  if (urlLower.includes("drive.google.com")) return "google_drive";

  return "other";
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============ QUERIES ============

/**
 * Get all files for a song
 */
export const listBySong = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify access via song
    try {
      await verifySongAccess(ctx, args.songId, userId);
    } catch {
      return [];
    }

    const files = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    // Get URLs for uploaded files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let url: string | null = null;
        if (file.storageId) {
          url = await ctx.storage.getUrl(file.storageId);
        } else if (file.externalUrl) {
          url = file.externalUrl;
        }
        return {
          ...file,
          url,
        };
      })
    );

    // Sort: primary first, then by version descending
    return filesWithUrls.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.version - a.version;
    });
  },
});

/**
 * Get user's storage usage
 */
export const getStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const usedBytes = user.storageUsedBytes ?? 0;
    const maxBytes = MAX_USER_STORAGE_BYTES;
    const remainingBytes = maxBytes - usedBytes;
    const percentUsed = (usedBytes / maxBytes) * 100;

    return {
      usedBytes,
      maxBytes,
      remainingBytes,
      percentUsed,
      usedFormatted: formatBytes(usedBytes),
      maxFormatted: formatBytes(maxBytes),
      remainingFormatted: formatBytes(remainingBytes),
    };
  },
});

// ============ MUTATIONS ============

/**
 * Generate an upload URL with rate limiting
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    const now = Date.now();

    // Check rate limit
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;

      if (windowExpired) {
        // Reset the window
        await ctx.db.patch(rateLimit._id, {
          uploadCount: 1,
          windowStart: now,
        });
      } else if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
        const minutesRemaining = Math.ceil(
          (rateLimit.windowStart + RATE_LIMIT_WINDOW_MS - now) / 60000
        );
        throw new Error(
          `Upload rate limit exceeded. Try again in ${minutesRemaining} minutes.`
        );
      } else {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      }
    } else {
      // Create new rate limit record
      await ctx.db.insert("uploadRateLimits", {
        userId,
        uploadCount: 1,
        windowStart: now,
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save an uploaded file to a song
 */
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
    const userId = await getCurrentUserId(ctx);

    // Verify song access
    await verifySongAccess(ctx, args.songId, userId);

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE_BYTES) {
      // Delete the uploaded file since it exceeds limits
      await ctx.storage.delete(args.storageId);
      throw new Error(`File too large. Maximum size is 100MB.`);
    }

    // Check user storage quota
    const user = await ctx.db.get(userId);
    const currentUsage = user?.storageUsedBytes ?? 0;
    if (currentUsage + args.fileSize > MAX_USER_STORAGE_BYTES) {
      // Delete the uploaded file since it exceeds quota
      await ctx.storage.delete(args.storageId);
      const remainingMB = Math.floor(
        (MAX_USER_STORAGE_BYTES - currentUsage) / 1024 / 1024
      );
      throw new Error(
        `Storage quota exceeded. You have ${remainingMB}MB remaining.`
      );
    }

    // Validate file type
    if (!FILE_TYPES.includes(args.fileType as FileType)) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`Invalid file type. Must be one of: ${FILE_TYPES.join(", ")}`);
    }

    // Update user's storage usage
    await ctx.db.patch(userId, {
      storageUsedBytes: currentUsage + args.fileSize,
      updatedAt: Date.now(),
    });

    // Get existing files for versioning
    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    const maxVersion =
      existingFiles.length > 0
        ? Math.max(...existingFiles.map((f) => f.version))
        : 0;

    // Check if this will be the primary file (first file for this song)
    const isPrimary = existingFiles.length === 0;

    // Create file record
    const fileId = await ctx.db.insert("songFiles", {
      songId: args.songId,
      storageId: args.storageId,
      fileType: args.fileType,
      variantLabel: args.variantLabel?.trim(),
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      version: maxVersion + 1,
      isPrimary,
      createdAt: Date.now(),
    });

    return { fileId, isPrimary };
  },
});

/**
 * Save an external URL link to a song
 */
export const saveExternalUrl = mutation({
  args: {
    songId: v.id("songs"),
    externalUrl: v.string(),
    fileType: v.string(),
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify song access
    await verifySongAccess(ctx, args.songId, userId);

    // Validate URL
    if (!args.externalUrl.trim()) {
      throw new Error("URL is required");
    }

    // Basic URL validation
    try {
      new URL(args.externalUrl);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Validate file type
    if (!FILE_TYPES.includes(args.fileType as FileType)) {
      throw new Error(`Invalid file type. Must be one of: ${FILE_TYPES.join(", ")}`);
    }

    // Detect external service
    const externalService = detectExternalService(args.externalUrl);

    // Get existing files for versioning
    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    const maxVersion =
      existingFiles.length > 0
        ? Math.max(...existingFiles.map((f) => f.version))
        : 0;

    // Create file record
    const fileId = await ctx.db.insert("songFiles", {
      songId: args.songId,
      externalUrl: args.externalUrl.trim(),
      externalService,
      fileType: args.fileType,
      variantLabel: args.variantLabel?.trim(),
      fileName: args.fileName?.trim(),
      version: maxVersion + 1,
      isPrimary: existingFiles.length === 0,
      createdAt: Date.now(),
    });

    return fileId;
  },
});

/**
 * Set a file as primary
 * Returns metadata diff if the file is audio with analysis data
 * Client should show confirmation dialog if there are conflicts
 */
export const setPrimary = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const file = await ctx.db.get(args.id);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Verify song access
    const { song } = await verifySongAccess(ctx, file.songId, userId);

    // Unset current primary
    const currentFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", file.songId).eq("deletedAt", undefined)
      )
      .collect();

    for (const f of currentFiles) {
      if (f.isPrimary && f._id !== args.id) {
        await ctx.db.patch(f._id, { isPrimary: false });
      }
    }

    // Set this file as primary
    await ctx.db.patch(args.id, { isPrimary: true });

    // If this is an audio file with analysis data, return diff for client confirmation
    if (file.fileType === "audio" && (file.detectedTempo !== undefined || file.detectedKey !== undefined || file.durationSeconds !== undefined)) {
      const hasConflict =
        (file.durationSeconds !== undefined && song.durationSeconds !== undefined && song.durationSeconds !== Math.round(file.durationSeconds)) ||
        (file.detectedTempo !== undefined && song.tempo !== undefined && song.tempo !== file.detectedTempo) ||
        (file.detectedKey !== undefined && song.key !== undefined && song.key !== file.detectedKey);

      const songHasNoMetadata =
        song.durationSeconds === undefined &&
        song.tempo === undefined &&
        song.key === undefined;

      return {
        fileId: args.id,
        songId: song._id as Id<"songs">,
        hasConflict,
        songHasNoMetadata,
        detected: {
          durationSeconds: file.durationSeconds ? Math.round(file.durationSeconds) : undefined,
          tempo: file.detectedTempo,
          key: file.detectedKey,
        },
        current: {
          durationSeconds: song.durationSeconds,
          tempo: song.tempo,
          key: song.key,
        },
      };
    }

    return {
      fileId: args.id,
      songId: song._id as Id<"songs">,
      hasConflict: false,
      songHasNoMetadata: false,
      detected: {},
      current: {
        durationSeconds: song.durationSeconds,
        tempo: song.tempo,
        key: song.key,
      },
    };
  },
});

/**
 * Delete a file (soft delete, reclaim storage)
 * If archiving the primary file, promotes the next file and returns metadata for confirmation
 */
export const softDelete = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const file = await ctx.db.get(args.id);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Verify song access
    const { song } = await verifySongAccess(ctx, file.songId, userId);

    const wasPrimary = file.isPrimary;

    // Soft delete the file record and clear primary status
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      isPrimary: false,
    });

    // Note: Storage is NOT deleted here - it's deleted in permanentDelete
    // This allows users to restore archived files

    // If this was the primary file, promote the next file
    if (wasPrimary) {
      const remainingFiles = await ctx.db
        .query("songFiles")
        .withIndex("by_song_active", (q) =>
          q.eq("songId", file.songId).eq("deletedAt", undefined)
        )
        .collect();

      if (remainingFiles.length > 0) {
        // Promote the most recent file
        const newPrimary = remainingFiles.sort(
          (a, b) => b.createdAt - a.createdAt
        )[0];
        await ctx.db.patch(newPrimary._id, { isPrimary: true });

        // Return metadata info for the new primary (like setPrimary does)
        if (newPrimary.fileType === "audio" && (
          newPrimary.detectedTempo !== undefined ||
          newPrimary.detectedKey !== undefined ||
          newPrimary.durationSeconds !== undefined
        )) {
          const hasConflict =
            (newPrimary.durationSeconds !== undefined && song.durationSeconds !== undefined && song.durationSeconds !== Math.round(newPrimary.durationSeconds)) ||
            (newPrimary.detectedTempo !== undefined && song.tempo !== undefined && song.tempo !== newPrimary.detectedTempo) ||
            (newPrimary.detectedKey !== undefined && song.key !== undefined && song.key !== newPrimary.detectedKey);

          const songHasNoMetadata =
            song.durationSeconds === undefined &&
            song.tempo === undefined &&
            song.key === undefined;

          return {
            archivedFileId: args.id,
            newPrimaryFileId: newPrimary._id,
            songId: song._id as Id<"songs">,
            hasConflict,
            songHasNoMetadata,
            detected: {
              durationSeconds: newPrimary.durationSeconds ? Math.round(newPrimary.durationSeconds) : undefined,
              tempo: newPrimary.detectedTempo,
              key: newPrimary.detectedKey,
            },
            current: {
              durationSeconds: song.durationSeconds,
              tempo: song.tempo,
              key: song.key,
            },
          };
        }

        return {
          archivedFileId: args.id,
          newPrimaryFileId: newPrimary._id,
          songId: song._id as Id<"songs">,
          hasConflict: false,
          songHasNoMetadata: false,
          detected: {},
          current: {
            durationSeconds: song.durationSeconds,
            tempo: song.tempo,
            key: song.key,
          },
        };
      }
    }

    // No primary promotion needed
    return {
      archivedFileId: args.id,
      newPrimaryFileId: null,
      songId: song._id as Id<"songs">,
      hasConflict: false,
      songHasNoMetadata: false,
      detected: {},
      current: {
        durationSeconds: song.durationSeconds,
        tempo: song.tempo,
        key: song.key,
      },
    };
  },
});

/**
 * Update file metadata
 */
export const updateMetadata = mutation({
  args: {
    id: v.id("songFiles"),
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const file = await ctx.db.get(args.id);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Verify song access
    await verifySongAccess(ctx, file.songId, userId);

    const updates: Partial<{
      variantLabel: string;
      fileName: string;
      fileType: string;
    }> = {};

    if (args.variantLabel !== undefined) {
      updates.variantLabel = args.variantLabel.trim();
    }
    if (args.fileName !== undefined) {
      updates.fileName = args.fileName.trim();
    }
    if (args.fileType !== undefined) {
      if (!FILE_TYPES.includes(args.fileType as FileType)) {
        throw new Error(`Invalid file type. Must be one of: ${FILE_TYPES.join(", ")}`);
      }
      updates.fileType = args.fileType;
    }

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

/**
 * Get archived (soft-deleted) files for a song
 */
export const listArchivedBySong = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify access via song
    try {
      await verifySongAccess(ctx, args.songId, userId);
    } catch {
      return [];
    }

    // Get all files for this song and filter to deleted ones
    const allFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song", (q) => q.eq("songId", args.songId))
      .collect();

    const deletedFiles = allFiles.filter((f) => f.deletedAt !== undefined);

    // Get URLs for both uploaded and external files
    // Storage is kept intact during soft delete, so we can get storage URLs
    const filesWithUrls = await Promise.all(
      deletedFiles.map(async (file) => {
        let url: string | null = null;
        if (file.storageId) {
          url = await ctx.storage.getUrl(file.storageId);
        } else if (file.externalUrl) {
          url = file.externalUrl;
        }
        return {
          ...file,
          url,
        };
      })
    );

    // Sort by deletion date, most recent first
    return filesWithUrls.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },
});

/**
 * Restore an archived file
 * If it becomes the only file, it's set as primary and returns metadata for confirmation
 */
export const restore = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) {
      throw new Error("File not found");
    }
    if (!file.deletedAt) {
      throw new Error("File is not archived");
    }

    // Verify song access
    const { song } = await verifySongAccess(ctx, file.songId, userId);

    // Check if there are any active files
    const activeFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", file.songId).eq("deletedAt", undefined)
      )
      .collect();

    const willBePrimary = activeFiles.length === 0;

    // Restore the file
    // If no active files exist, the restored file becomes primary
    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      isPrimary: willBePrimary,
    });

    // If this file becomes primary and is audio with metadata, return info for dialog
    if (willBePrimary && file.fileType === "audio" && (
      file.detectedTempo !== undefined ||
      file.detectedKey !== undefined ||
      file.durationSeconds !== undefined
    )) {
      const hasConflict =
        (file.durationSeconds !== undefined && song.durationSeconds !== undefined && song.durationSeconds !== Math.round(file.durationSeconds)) ||
        (file.detectedTempo !== undefined && song.tempo !== undefined && song.tempo !== file.detectedTempo) ||
        (file.detectedKey !== undefined && song.key !== undefined && song.key !== file.detectedKey);

      const songHasNoMetadata =
        song.durationSeconds === undefined &&
        song.tempo === undefined &&
        song.key === undefined;

      return {
        restoredFileId: args.id,
        becamePrimary: true,
        songId: song._id as Id<"songs">,
        hasConflict,
        songHasNoMetadata,
        detected: {
          durationSeconds: file.durationSeconds ? Math.round(file.durationSeconds) : undefined,
          tempo: file.detectedTempo,
          key: file.detectedKey,
        },
        current: {
          durationSeconds: song.durationSeconds,
          tempo: song.tempo,
          key: song.key,
        },
      };
    }

    return {
      restoredFileId: args.id,
      becamePrimary: willBePrimary,
      songId: song._id as Id<"songs">,
      hasConflict: false,
      songHasNoMetadata: false,
      detected: {},
      current: {
        durationSeconds: song.durationSeconds,
        tempo: song.tempo,
        key: song.key,
      },
    };
  },
});

/**
 * Permanently delete an archived file (hard delete)
 */
export const permanentDelete = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const file = await ctx.db.get(args.id);
    if (!file) {
      throw new Error("File not found");
    }
    if (!file.deletedAt) {
      throw new Error("File must be archived before permanent deletion");
    }

    // Verify song access
    await verifySongAccess(ctx, file.songId, userId);

    // If this was an uploaded file, delete from storage and reclaim quota
    if (file.storageId) {
      // Delete from storage
      await ctx.storage.delete(file.storageId);

      // Reclaim storage quota
      if (file.fileSize) {
        const user = await ctx.db.get(userId);
        const currentUsage = user?.storageUsedBytes ?? 0;
        await ctx.db.patch(userId, {
          storageUsedBytes: Math.max(0, currentUsage - file.fileSize),
          updatedAt: Date.now(),
        });
      }
    }

    // Permanently delete the record
    await ctx.db.delete(args.id);

    return args.id;
  },
});
