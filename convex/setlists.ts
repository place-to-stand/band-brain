import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Default buffer time between songs in seconds
const DEFAULT_BUFFER_SECONDS = 30;

// ============ QUERIES ============

export const listByBand = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("setlists")
      .withIndex("by_band_active", (q) =>
        q.eq("bandId", args.bandId).eq("deletedAt", undefined)
      )
      .order("desc")
      .collect();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    // Get all bands for this user
    const bands = await ctx.db
      .query("bands")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("deletedAt", undefined)
      )
      .collect();

    const bandIds = bands.map((b) => b._id);

    // Get all setlists for these bands
    const allSetlists = await ctx.db
      .query("setlists")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    // Filter to only setlists for user's bands
    return allSetlists.filter((s) => bandIds.includes(s.bandId));
  },
});

export const getById = query({
  args: { id: v.id("setlists") },
  handler: async (ctx, args) => {
    const setlist = await ctx.db.get(args.id);
    if (!setlist || setlist.deletedAt) return null;
    return setlist;
  },
});

export const getWithItems = query({
  args: { id: v.id("setlists") },
  handler: async (ctx, args) => {
    const setlist = await ctx.db.get(args.id);
    if (!setlist || setlist.deletedAt) return null;

    // Get setlist items
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Sort by position
    items.sort((a, b) => a.position - b.position);

    // Get song details for each item
    const itemsWithSongs = await Promise.all(
      items.map(async (item) => {
        const song = await ctx.db.get(item.songId);
        return {
          ...item,
          song: song && !song.deletedAt ? song : null,
        };
      })
    );

    return {
      ...setlist,
      items: itemsWithSongs,
    };
  },
});

export const getSetlistWithDuration = query({
  args: { id: v.id("setlists") },
  handler: async (ctx, args) => {
    const setlist = await ctx.db.get(args.id);
    if (!setlist || setlist.deletedAt) return null;

    // Get setlist items with songs
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    items.sort((a, b) => a.position - b.position);

    let totalDuration = 0;
    const itemsWithDuration = await Promise.all(
      items.map(async (item, index) => {
        const song = await ctx.db.get(item.songId);
        const songDuration = song?.durationSeconds ?? 0;
        const bufferTime = index < items.length - 1 ? DEFAULT_BUFFER_SECONDS : 0;
        totalDuration += songDuration + bufferTime;

        return {
          ...item,
          song: song && !song.deletedAt ? song : null,
          runningDuration: totalDuration,
        };
      })
    );

    return {
      ...setlist,
      items: itemsWithDuration,
      totalDuration,
    };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    eventDate: v.optional(v.number()),
    venue: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Verify band belongs to user
    const band = await ctx.db.get(args.bandId);
    if (!band || band.deletedAt || band.userId !== userId) {
      throw new Error("Band not found");
    }

    const now = Date.now();
    return await ctx.db.insert("setlists", {
      bandId: args.bandId,
      name: args.name,
      eventDate: args.eventDate,
      venue: args.venue,
      notes: args.notes,
      totalDurationSeconds: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("setlists"),
    name: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    venue: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const setlist = await ctx.db.get(args.id);
    if (!setlist || setlist.deletedAt) {
      throw new Error("Setlist not found");
    }

    // Verify band ownership
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("setlists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const setlist = await ctx.db.get(args.id);
    if (!setlist || setlist.deletedAt) {
      throw new Error("Setlist not found");
    }

    // Verify band ownership
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("setlists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const setlist = await ctx.db.get(args.id);
    if (!setlist) {
      throw new Error("Setlist not found");
    }

    // Verify band ownership
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ============ SETLIST ITEMS ============

export const addSongToSetlist = mutation({
  args: {
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
    transitionNotes: v.optional(v.string()),
    gearSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist || setlist.deletedAt) {
      throw new Error("Setlist not found");
    }

    // Verify band ownership
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Verify song exists and belongs to the same band
    const song = await ctx.db.get(args.songId);
    if (!song || song.deletedAt || song.bandId !== setlist.bandId) {
      throw new Error("Song not found in this band");
    }

    // Get current item count for position
    const existingItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const position = existingItems.length;
    const now = Date.now();

    const itemId = await ctx.db.insert("setlistItems", {
      setlistId: args.setlistId,
      songId: args.songId,
      position,
      transitionNotes: args.transitionNotes,
      gearSnapshot: args.gearSnapshot,
      createdAt: now,
      updatedAt: now,
    });

    // Recalculate setlist duration
    await recalculateSetlistDuration(ctx, args.setlistId);

    return itemId;
  },
});

export const removeSongFromSetlist = mutation({
  args: { id: v.id("setlistItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const item = await ctx.db.get(args.id);
    if (!item || item.deletedAt) {
      throw new Error("Item not found");
    }

    // Verify setlist/band ownership
    const setlist = await ctx.db.get(item.setlistId);
    if (!setlist) {
      throw new Error("Setlist not found");
    }

    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Reorder remaining items
    const remainingItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", item.setlistId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    remainingItems.sort((a, b) => a.position - b.position);

    for (let i = 0; i < remainingItems.length; i++) {
      if (remainingItems[i].position !== i) {
        await ctx.db.patch(remainingItems[i]._id, { position: i });
      }
    }

    // Recalculate setlist duration
    await recalculateSetlistDuration(ctx, item.setlistId);
  },
});

export const reorderSetlistItems = mutation({
  args: {
    setlistId: v.id("setlists"),
    itemIds: v.array(v.id("setlistItems")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist || setlist.deletedAt) {
      throw new Error("Setlist not found");
    }

    // Verify band ownership
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Update positions based on new order
    for (let i = 0; i < args.itemIds.length; i++) {
      await ctx.db.patch(args.itemIds[i], { position: i });
    }
  },
});

export const updateSetlistItem = mutation({
  args: {
    id: v.id("setlistItems"),
    transitionNotes: v.optional(v.string()),
    gearSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const item = await ctx.db.get(args.id);
    if (!item || item.deletedAt) {
      throw new Error("Item not found");
    }

    // Verify setlist/band ownership
    const setlist = await ctx.db.get(item.setlistId);
    if (!setlist) {
      throw new Error("Setlist not found");
    }

    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) {
      throw new Error("Not authorized");
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// ============ HELPERS ============

/* eslint-disable @typescript-eslint/no-explicit-any */
async function recalculateSetlistDuration(
  ctx: any,
  setlistId: Id<"setlists">
) {
  const items = await ctx.db
    .query("setlistItems")
    .withIndex("by_setlist", (q: any) => q.eq("setlistId", setlistId))
    .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
    .collect();
/* eslint-enable @typescript-eslint/no-explicit-any */

  let totalDuration = 0;

  for (let i = 0; i < items.length; i++) {
    const song = await ctx.db.get(items[i].songId);
    const songDuration = song?.durationSeconds ?? 0;
    const bufferTime = i < items.length - 1 ? DEFAULT_BUFFER_SECONDS : 0;
    totalDuration += songDuration + bufferTime;
  }

  await ctx.db.patch(setlistId, {
    totalDurationSeconds: totalDuration,
    updatedAt: Date.now(),
  });
}
