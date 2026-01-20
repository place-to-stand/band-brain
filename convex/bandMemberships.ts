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
 * List all active members of a band with user details
 */
export const listByBand = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify the requester is a member of the band
    const requesterMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", userId)
      )
      .first();

    if (!requesterMembership || requesterMembership.leftAt) {
      return [];
    }

    // Get all active memberships
    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", args.bandId).eq("leftAt", undefined)
      )
      .collect();

    // Get user details for each membership
    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const memberUser = await ctx.db.get(membership.userId);
        if (!memberUser || memberUser.deletedAt) {
          return null;
        }

        return {
          _id: membership._id,
          bandId: membership.bandId,
          userId: membership.userId,
          instruments: membership.instruments,
          joinedAt: membership.joinedAt,
          user: {
            _id: memberUser._id,
            name: memberUser.name,
            email: memberUser.email,
            imageUrl: memberUser.imageUrl,
          },
        };
      })
    );

    // Filter nulls and sort by join date (oldest first)
    return membersWithDetails
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  },
});

/**
 * Get current user's membership in a band
 */
export const getMyMembership = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return null;
    }

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      return null;
    }

    const band = await ctx.db.get(args.bandId);

    return {
      ...membership,
      isCreator: band?.createdBy === userId,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Join a band via invite code
 */
export const join = mutation({
  args: {
    inviteCode: v.string(),
    instruments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Find band by invite code
    const band = await ctx.db
      .query("bands")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCode", args.inviteCode.toUpperCase())
      )
      .first();

    if (!band || band.deletedAt) {
      throw new Error("Invalid invite code");
    }

    // Check for existing membership
    const existingMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", band._id).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      if (!existingMembership.leftAt) {
        throw new Error("Already a member of this band");
      }

      // Rejoin: clear leftAt and optionally update instruments
      await ctx.db.patch(existingMembership._id, {
        leftAt: undefined,
        instruments: args.instruments ?? existingMembership.instruments,
      });

      return existingMembership._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("bandMemberships", {
      bandId: band._id,
      userId,
      instruments: args.instruments ?? [],
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});

/**
 * Leave a band (soft delete via leftAt)
 */
export const leave = mutation({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.bandId);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      throw new Error("Not a member of this band");
    }

    // Check if this is the last member
    const activeMemberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", args.bandId).eq("leftAt", undefined)
      )
      .collect();

    if (activeMemberships.length === 1) {
      throw new Error(
        "Cannot leave as the last member. Delete the band instead."
      );
    }

    await ctx.db.patch(membership._id, {
      leftAt: Date.now(),
    });

    return membership._id;
  },
});

/**
 * Update instruments for current user in a band
 */
export const updateInstruments = mutation({
  args: {
    bandId: v.id("bands"),
    instruments: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const band = await ctx.db.get(args.bandId);
    if (!band || band.deletedAt) {
      throw new Error("Band not found");
    }

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.leftAt) {
      throw new Error("Not a member of this band");
    }

    await ctx.db.patch(membership._id, {
      instruments: args.instruments,
    });

    return membership._id;
  },
});
