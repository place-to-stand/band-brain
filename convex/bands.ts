import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Safe characters (no 0/O/1/I/L confusion for verbal sharing)
const INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;

/**
 * Generate a 6-character invite code using safe characters
 */
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITE_CODE_CHARS.length)
    );
  }
  return code;
}

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
 * List all active bands where the current user is a member
 */
export const listMyBands = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get all active memberships for this user
    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter out left memberships
    const activeMemberships = memberships.filter((m) => !m.leftAt);

    // Get the bands for active memberships
    const bands = await Promise.all(
      activeMemberships.map(async (membership) => {
        const band = await ctx.db.get(membership.bandId);
        if (!band || band.deletedAt) {
          return null;
        }

        // Get member count for this band
        const allMemberships = await ctx.db
          .query("bandMemberships")
          .withIndex("by_band_active", (q) =>
            q.eq("bandId", band._id).eq("leftAt", undefined)
          )
          .collect();

        return {
          ...band,
          memberCount: allMemberships.length,
          myInstruments: membership.instruments,
        };
      })
    );

    // Filter out null results and sort by creation date (newest first)
    return bands
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single band by ID (with membership check)
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

    // Check if user is a member
    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.id).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      return null;
    }

    // Get member count
    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", band._id).eq("leftAt", undefined)
      )
      .collect();

    return {
      ...band,
      memberCount: memberships.length,
      isCreator: band.createdBy === userId,
    };
  },
});

/**
 * Preview a band by invite code (public - for join flow)
 */
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const band = await ctx.db
      .query("bands")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCode", args.inviteCode.toUpperCase())
      )
      .first();

    if (!band || band.deletedAt) {
      return null;
    }

    // Get member count
    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", band._id).eq("leftAt", undefined)
      )
      .collect();

    // Return limited info for preview (no invite code exposed)
    return {
      _id: band._id,
      name: band.name,
      memberCount: memberships.length,
      createdAt: band.createdAt,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Create a new band and auto-create membership for creator
 */
export const create = mutation({
  args: {
    name: v.string(),
    instruments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    if (!args.name.trim()) {
      throw new Error("Band name is required");
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let existingBand = await ctx.db
      .query("bands")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .first();

    // Regenerate if collision (unlikely but safe)
    while (existingBand) {
      inviteCode = generateInviteCode();
      existingBand = await ctx.db
        .query("bands")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
    }

    const now = Date.now();

    // Create the band
    const bandId = await ctx.db.insert("bands", {
      createdBy: userId,
      name: args.name.trim(),
      inviteCode,
      createdAt: now,
    });

    // Auto-create membership for creator
    await ctx.db.insert("bandMemberships", {
      bandId,
      userId,
      instruments: args.instruments ?? [],
      joinedAt: now,
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

    // Check membership
    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.id).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      throw new Error("Not a member of this band");
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
 * Soft delete a band (creator only)
 */
export const softDelete = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    if (band.createdBy !== userId) {
      throw new Error("Only the band creator can delete the band");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Regenerate invite code for a band
 */
export const regenerateInviteCode = mutation({
  args: { id: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.id);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.id).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      throw new Error("Not a member of this band");
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let existingBand = await ctx.db
      .query("bands")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .first();

    while (existingBand) {
      inviteCode = generateInviteCode();
      existingBand = await ctx.db
        .query("bands")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
    }

    await ctx.db.patch(args.id, {
      inviteCode,
      updatedAt: Date.now(),
    });

    return inviteCode;
  },
});
