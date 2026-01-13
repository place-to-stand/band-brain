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
      .query("bands")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("deletedAt", undefined)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) return null;

    // Verify ownership
    if (band.userId !== userId) return null;

    return band;
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const now = Date.now();
    return await ctx.db.insert("bands", {
      userId,
      name: args.name,
      myInstruments: args.myInstruments,
      members: args.members,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("bands"),
    name: v.optional(v.string()),
    myInstruments: v.optional(v.array(v.string())),
    members: v.optional(
      v.array(
        v.object({
          name: v.string(),
          instrument: v.optional(v.string()),
          email: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    // Verify ownership
    if (band.userId !== userId) {
      throw new Error("Not authorized to update this band");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    // Verify ownership
    if (band.userId !== userId) {
      throw new Error("Not authorized to delete this band");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const band = await ctx.db.get(args.id);
    if (!band) {
      throw new Error("Band not found");
    }

    // Verify ownership
    if (band.userId !== userId) {
      throw new Error("Not authorized to restore this band");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
