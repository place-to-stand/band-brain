import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current authenticated user
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

/**
 * Get a user by ID
 */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create or update a user when they sign in
 * Called internally by the auth callback
 */
export const upsertFromAuth = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user with latest profile info
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      storageUsedBytes: 0,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      ...args,
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Get user's storage usage
 */
export const getStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

    return {
      usedBytes: user.storageUsedBytes ?? 0,
      limitBytes: STORAGE_LIMIT_BYTES,
      percentUsed: ((user.storageUsedBytes ?? 0) / STORAGE_LIMIT_BYTES) * 100,
    };
  },
});

/**
 * Internal mutation to update storage usage
 */
export const updateStorageUsage = internalMutation({
  args: {
    userId: v.id("users"),
    bytesChange: v.number(), // Positive to add, negative to remove
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentUsage = user.storageUsedBytes ?? 0;
    const newUsage = Math.max(0, currentUsage + args.bytesChange);

    await ctx.db.patch(args.userId, {
      storageUsedBytes: newUsage,
      updatedAt: Date.now(),
    });
  },
});
