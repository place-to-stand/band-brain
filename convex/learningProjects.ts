import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    return await ctx.db
      .query("learningProjects")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("deletedAt", undefined)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("learningProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) return null;

    return project;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    artist: v.optional(v.string()),
    projectType: v.union(
      v.literal("repertoire"),
      v.literal("technique"),
      v.literal("theory"),
      v.literal("transcription"),
      v.literal("other")
    ),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    notes: v.optional(v.string()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const now = Date.now();
    return await ctx.db.insert("learningProjects", {
      userId,
      title: args.title,
      artist: args.artist,
      projectType: args.projectType,
      key: args.key,
      mode: args.mode,
      tempo: args.tempo,
      timeSignature: args.timeSignature || "4/4",
      notes: args.notes,
      status: "not_started",
      targetDate: args.targetDate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("learningProjects"),
    title: v.optional(v.string()),
    artist: v.optional(v.string()),
    projectType: v.optional(
      v.union(
        v.literal("repertoire"),
        v.literal("technique"),
        v.literal("theory"),
        v.literal("transcription"),
        v.literal("other")
      )
    ),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("on_hold")
      )
    ),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Learning project not found");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("learningProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Learning project not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("learningProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Learning project not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
