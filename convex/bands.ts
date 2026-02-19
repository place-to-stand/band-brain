import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Helper to get the current user ID from auth
 * Uses Convex Auth's getAuthUserId which returns the user ID directly
 */
async function getCurrentUserId(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/**
 * Helper to get current user ID in queries
 */
async function getQueryUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  return userId;
}

// ============ QUERIES ============

/**
 * List all active bands owned by the current user
 * In the single-user model, bands are personal song collections
 */
export const listMyBands = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get all bands created by this user
    const bands = await ctx.db
      .query("bands")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();

    // Filter out deleted bands and sort by creation date (newest first)
    return bands
      .filter((b) => !b.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single band by ID (with ownership check)
 */
export const get = query({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return null;
    }

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      return null;
    }

    // Check if user owns this band
    if (band.createdBy !== userId) {
      return null;
    }

    return band;
  },
});

// ============ MUTATIONS ============

/**
 * Create a new band (personal song collection)
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    if (!args.name.trim()) {
      throw new Error("Band name is required");
    }

    const now = Date.now();

    // Create the band
    const bandId = await ctx.db.insert("bands", {
      createdBy: userId,
      name: args.name.trim(),
      createdAt: now,
    });

    return bandId;
  },
});

/**
 * Update band name
 */
export const update = mutation({
  args: {
    id: v.id("bands"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    // Check ownership
    if (band.createdBy !== userId) {
      throw new Error("Not authorized to update this band");
    }

    if (!args.name.trim()) {
      throw new Error("Band name is required");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Soft delete a band
 */
export const softDelete = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    // Check ownership
    if (band.createdBy !== userId) {
      throw new Error("Not authorized to delete this band");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
