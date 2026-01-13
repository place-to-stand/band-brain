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
    fileName: v.string(),
    fileType: v.union(
      v.literal("audio"),
      v.literal("tab"),
      v.literal("chart"),
      v.literal("other")
    ),
    mimeType: v.string(),
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

    // Update rate limit
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (rateLimit) {
      if (rateLimit.windowStart > oneHourAgo) {
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
    return await ctx.db.insert("songFiles", {
      songId: args.songId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listBySong = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

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
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const softDelete = mutation({
  args: { id: v.id("songFiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const file = await ctx.db.get(args.id);
    if (!file || file.deletedAt) {
      throw new Error("File not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const saveLearningProjectFile = mutation({
  args: {
    learningProjectId: v.id("learningProjects"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.union(
      v.literal("audio"),
      v.literal("tab"),
      v.literal("chart"),
      v.literal("other")
    ),
    mimeType: v.string(),
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
    const project = await ctx.db.get(args.learningProjectId);
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
      learningProjectId: args.learningProjectId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listByLearningProject = query({
  args: { learningProjectId: v.id("learningProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("learningProjectFiles")
      .withIndex("by_project", (q) =>
        q.eq("learningProjectId", args.learningProjectId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
