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
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    const sessions = await ctx.db
      .query("practiceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by date range
    return sessions.filter(
      (s) => s.date >= args.startDate && s.date <= args.endDate
    );
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
    date: v.string(),
    durationMinutes: v.optional(v.number()),
    bandId: v.optional(v.id("bands")),
    learningProjectId: v.optional(v.id("learningProjects")),
    songsWorked: v.optional(v.array(v.id("songs"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Verify band exists and belongs to user if provided
    if (args.bandId) {
      const band = await ctx.db.get(args.bandId);
      if (!band || band.deletedAt || band.userId !== userId) {
        throw new Error("Band not found");
      }
    }

    // Verify learning project exists and belongs to user if provided
    if (args.learningProjectId) {
      const project = await ctx.db.get(args.learningProjectId);
      if (!project || project.deletedAt || project.userId !== userId) {
        throw new Error("Learning project not found");
      }
    }

    // Verify songs exist and belong to user's bands if provided
    if (args.songsWorked && args.songsWorked.length > 0) {
      for (const songId of args.songsWorked) {
        const song = await ctx.db.get(songId);
        if (!song || song.deletedAt) {
          throw new Error("Song not found");
        }
        const band = await ctx.db.get(song.bandId);
        if (!band || band.userId !== userId) {
          throw new Error("Not authorized to log practice for this song");
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert("practiceSessions", {
      userId,
      date: args.date,
      durationMinutes: args.durationMinutes,
      bandId: args.bandId,
      learningProjectId: args.learningProjectId,
      songsWorked: args.songsWorked,
      notes: args.notes,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("practiceSessions"),
    date: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    bandId: v.optional(v.id("bands")),
    learningProjectId: v.optional(v.id("learningProjects")),
    songsWorked: v.optional(v.array(v.id("songs"))),
    notes: v.optional(v.string()),
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
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
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
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
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
      sessions = sessions.filter((s) => s.date >= args.startDate!);
    }
    if (args.endDate) {
      sessions = sessions.filter((s) => s.date <= args.endDate!);
    }

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce(
      (acc, s) => acc + (s.durationMinutes || 0),
      0
    );
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return {
      totalSessions,
      totalDuration,
      avgDuration,
    };
  },
});
