import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listByBand = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("songs")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", args.bandId).eq("deletedAt", undefined)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) return null;

    return song;
  },
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    title: v.string(),
    artist: v.optional(v.string()),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Verify band exists and belongs to user
    const band = await ctx.db.get(args.bandId);
    if (!band || band.deletedAt || band.userId !== userId) {
      throw new Error("Band not found");
    }

    const now = Date.now();
    return await ctx.db.insert("songs", {
      bandId: args.bandId,
      title: args.title,
      artist: args.artist,
      key: args.key,
      mode: args.mode,
      tempo: args.tempo,
      timeSignature: args.timeSignature || "4/4",
      duration: args.duration,
      notes: args.notes,
      practiceStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("songs"),
    title: v.optional(v.string()),
    artist: v.optional(v.string()),
    key: v.optional(v.string()),
    mode: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
    practiceStatus: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("learning"),
        v.literal("refining"),
        v.literal("performance_ready")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const song = await ctx.db.get(args.id);
    if (!song) {
      throw new Error("Song not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
