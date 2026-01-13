import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_UPLOADS_PER_HOUR = 50;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Check rate limit
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (rateLimit) {
      if (rateLimit.windowStart > oneHourAgo) {
        if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
          throw new Error("Upload rate limit exceeded. Try again later.");
        }
      }
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveSongFile = mutation({
  args: {
    songId: v.id("songs"),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    fileType: v.string(),
    variantLabel: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
      );
    }

    // Verify song exists
    const song = await ctx.db.get(args.songId);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify user owns the band this song belongs to
    const band = await ctx.db.get(song.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized to upload files to this song");
    }

    // Update rate limit
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (rateLimit) {
      if (rateLimit.windowStart > oneHourAgo) {
        if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
          throw new Error("Upload rate limit exceeded. Try again later.");
        }
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      } else {
        await ctx.db.patch(rateLimit._id, {
          windowStart: Date.now(),
          uploadCount: 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        userId,
        windowStart: Date.now(),
        uploadCount: 1,
      });
    }

    // Get existing files to determine version number
    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song", (q) => q.eq("songId", args.songId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const maxVersion = existingFiles.length > 0
      ? Math.max(...existingFiles.map((f) => f.version))
      : 0;

    const now = Date.now();
    return await ctx.db.insert("songFiles", {
      songId: args.songId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      variantLabel: args.variantLabel,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      version: maxVersion + 1,
      isPrimary: existingFiles.length === 0,
      createdAt: now,
    });
  },
});

export const listBySong = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    // Verify user owns the band this song belongs to
    const song = await ctx.db.get(args.songId);
    if (!song || song.deletedAt) return [];

    const band = await ctx.db.get(song.bandId);
    if (!band || band.userId !== userId) return [];

    return await ctx.db
      .query("songFiles")
      .withIndex("by_song", (q) => q.eq("songId", args.songId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.storage.getUrl(args.storageId);
  },
});

export const softDelete = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const file = await ctx.db.get(args.id);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    // Verify user owns the band this song belongs to
    const song = await ctx.db.get(file.songId);
    if (!song) {
      throw new Error("Song not found");
    }

    const band = await ctx.db.get(song.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized to delete this file");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
  },
});

export const saveLearningProjectFile = mutation({
  args: {
    projectId: v.id("learningProjects"),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
      );
    }

    // Verify learning project exists and belongs to user
    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Learning project not found");
    }

    // Update rate limit (same as song files)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (rateLimit) {
      if (rateLimit.windowStart > oneHourAgo) {
        if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
          throw new Error("Upload rate limit exceeded. Try again later.");
        }
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      } else {
        await ctx.db.patch(rateLimit._id, {
          windowStart: Date.now(),
          uploadCount: 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        userId,
        windowStart: Date.now(),
        uploadCount: 1,
      });
    }

    const now = Date.now();
    return await ctx.db.insert("learningProjectFiles", {
      projectId: args.projectId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      createdAt: now,
    });
  },
});

export const listByLearningProject = query({
  args: { projectId: v.id("learningProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    // Verify user owns this project
    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt || project.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("learningProjectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
