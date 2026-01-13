import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    const queryBuilder = ctx.db
      .query("practiceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.limit) {
      return await queryBuilder.take(args.limit);
    }
    return await queryBuilder.collect();
  },
});

export const listByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    return await ctx.db
      .query("practiceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), args.startDate),
          q.lte(q.field("startTime"), args.endDate)
        )
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("practiceSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) return null;

    return session;
  },
});

export const create = mutation({
  args: {
    songId: v.optional(v.id("songs")),
    learningProjectId: v.optional(v.id("learningProjects")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
    focusAreas: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // At least one of songId or learningProjectId should be provided
    if (!args.songId && !args.learningProjectId) {
      throw new Error("Either songId or learningProjectId must be provided");
    }

    // Verify song exists if provided
    if (args.songId) {
      const song = await ctx.db.get(args.songId);
      if (!song || song.deletedAt) {
        throw new Error("Song not found");
      }
    }

    // Verify learning project exists if provided
    if (args.learningProjectId) {
      const project = await ctx.db.get(args.learningProjectId);
      if (!project || project.deletedAt || project.userId !== userId) {
        throw new Error("Learning project not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("practiceSessions", {
      userId,
      songId: args.songId,
      learningProjectId: args.learningProjectId,
      startTime: args.startTime,
      endTime: args.endTime,
      duration: args.duration,
      notes: args.notes,
      focusAreas: args.focusAreas,
      rating: args.rating,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("practiceSessions"),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
    focusAreas: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Practice session not found");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("practiceSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Practice session not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    let sessions = await ctx.db
      .query("practiceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by date range if provided
    if (args.startDate) {
      sessions = sessions.filter((s) => s.startTime >= args.startDate!);
    }
    if (args.endDate) {
      sessions = sessions.filter((s) => s.startTime <= args.endDate!);
    }

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const avgRating =
      sessions.filter((s) => s.rating).length > 0
        ? sessions.reduce((acc, s) => acc + (s.rating || 0), 0) /
          sessions.filter((s) => s.rating).length
        : 0;

    return {
      totalSessions,
      totalDuration,
      avgDuration,
      avgRating,
    };
  },
});
