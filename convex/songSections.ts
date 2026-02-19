import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============ CONSTANTS ============

// Common section names
export const SECTION_NAMES = [
  "Intro",
  "Verse",
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Solo",
  "Breakdown",
  "Interlude",
  "Outro",
  "Tag",
  "Instrumental",
] as const;

// ============ HELPERS ============

async function getCurrentUserId(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

async function getQueryUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  return userId;
}

/**
 * Verify user owns the band that owns the song
 */
async function verifySongAccess(
  ctx: QueryCtx | MutationCtx,
  songId: Id<"songs">,
  userId: Id<"users">
): Promise<Id<"bands">> {
  const song = await ctx.db.get(songId);
  if (!song || song.deletedAt) {
    throw new Error("Song not found");
  }

  const band = await ctx.db.get(song.bandId);
  if (!band || band.deletedAt) {
    throw new Error("Band not found");
  }

  if (band.createdBy !== userId) {
    throw new Error("Not authorized to access this song");
  }

  return song.bandId;
}

// ============ QUERIES ============

/**
 * List all sections for a song, grouped by instrument
 */
export const listBySong = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify access
    try {
      await verifySongAccess(ctx, args.songId, userId);
    } catch {
      return [];
    }

    const sections = await ctx.db
      .query("songSections")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    // Sort by position
    return sections.sort((a, b) => a.position - b.position);
  },
});

/**
 * List sections for a specific instrument in a song
 */
export const listByInstrument = query({
  args: {
    songId: v.id("songs"),
    instrument: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify access
    try {
      await verifySongAccess(ctx, args.songId, userId);
    } catch {
      return [];
    }

    const sections = await ctx.db
      .query("songSections")
      .withIndex("by_song_instrument", (q) =>
        q.eq("songId", args.songId).eq("instrument", args.instrument)
      )
      .collect();

    // Filter out deleted and sort by position
    return sections
      .filter((s) => !s.deletedAt)
      .sort((a, b) => a.position - b.position);
  },
});

/**
 * Get a single section by ID
 */
export const get = query({
  args: { id: v.id("songSections") },
  handler: async (ctx, args) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return null;
    }

    const section = await ctx.db.get(args.id);
    if (!section || section.deletedAt) {
      return null;
    }

    // Verify access via song
    try {
      await verifySongAccess(ctx, section.songId, userId);
    } catch {
      return null;
    }

    return section;
  },
});

// ============ MUTATIONS ============

/**
 * Create a new song section
 */
export const create = mutation({
  args: {
    songId: v.id("songs"),
    instrument: v.string(),
    name: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify song access
    await verifySongAccess(ctx, args.songId, userId);

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Section name is required");
    }

    // Get existing sections for this instrument to determine position
    const existingSections = await ctx.db
      .query("songSections")
      .withIndex("by_song_instrument", (q) =>
        q.eq("songId", args.songId).eq("instrument", args.instrument)
      )
      .collect();

    const activeSections = existingSections.filter((s) => !s.deletedAt);
    const maxPosition =
      activeSections.length > 0
        ? Math.max(...activeSections.map((s) => s.position))
        : -1;

    const now = Date.now();

    const sectionId = await ctx.db.insert("songSections", {
      songId: args.songId,
      instrument: args.instrument,
      name: args.name.trim(),
      position: maxPosition + 1,
      notes: args.notes?.trim(),
      createdAt: now,
    });

    return sectionId;
  },
});

/**
 * Update a song section
 */
export const update = mutation({
  args: {
    id: v.id("songSections"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const section = await ctx.db.get(args.id);
    if (!section || section.deletedAt) {
      throw new Error("Section not found");
    }

    // Verify song access
    await verifySongAccess(ctx, section.songId, userId);

    const updates: Partial<{
      name: string;
      notes: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      if (!args.name.trim()) {
        throw new Error("Section name is required");
      }
      updates.name = args.name.trim();
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes.trim();
    }

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

/**
 * Reorder sections within the same instrument
 */
export const reorder = mutation({
  args: {
    sectionIds: v.array(v.id("songSections")),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    if (args.sectionIds.length === 0) {
      return;
    }

    // Verify all sections exist and belong to the same song/instrument
    const sections = await Promise.all(
      args.sectionIds.map((id) => ctx.db.get(id))
    );

    const validSections = sections.filter(
      (s): s is NonNullable<typeof s> => s !== null && !s.deletedAt
    );

    if (validSections.length !== args.sectionIds.length) {
      throw new Error("One or more sections not found");
    }

    const songId = validSections[0].songId;
    const instrument = validSections[0].instrument;

    // Verify all sections belong to same song and instrument
    for (const section of validSections) {
      if (section.songId !== songId || section.instrument !== instrument) {
        throw new Error("All sections must belong to the same song and instrument");
      }
    }

    // Verify song access
    await verifySongAccess(ctx, songId, userId);

    // Update positions
    const now = Date.now();
    for (let i = 0; i < args.sectionIds.length; i++) {
      await ctx.db.patch(args.sectionIds[i], {
        position: i,
        updatedAt: now,
      });
    }
  },
});

/**
 * Soft delete a section
 */
export const softDelete = mutation({
  args: { id: v.id("songSections") },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const section = await ctx.db.get(args.id);
    if (!section || section.deletedAt) {
      throw new Error("Section not found");
    }

    // Verify song access
    await verifySongAccess(ctx, section.songId, userId);

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Get all unique gear names the user has ever used (for autocomplete)
 */
export const getAllGearNames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getQueryUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get all bands owned by user
    const bands = await ctx.db
      .query("bands")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();

    const activeBands = bands.filter((b) => !b.deletedAt);
    if (activeBands.length === 0) {
      return [];
    }

    // Get all songs from user's bands
    const allSongs = await Promise.all(
      activeBands.map((band) =>
        ctx.db
          .query("songs")
          .withIndex("by_band_active", (q) =>
            q.eq("bandId", band._id).eq("deletedAt", undefined)
          )
          .collect()
      )
    );
    const songs = allSongs.flat();

    // Get all sections from all songs
    const allSections = await Promise.all(
      songs.map((song) =>
        ctx.db
          .query("songSections")
          .withIndex("by_song_active", (q) =>
            q.eq("songId", song._id).eq("deletedAt", undefined)
          )
          .collect()
      )
    );
    const sections = allSections.flat();

    // Extract unique gear names
    const gearNames = new Set<string>();
    for (const section of sections) {
      if (section.gearSettings?.gear) {
        for (const gear of section.gearSettings.gear) {
          if (gear.name.trim()) {
            gearNames.add(gear.name.trim());
          }
        }
      }
    }

    // Return sorted array
    return Array.from(gearNames).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  },
});

// ============ GEAR SETTINGS ============

// Validators matching the schema
const knobValidator = v.object({
  label: v.string(),
  position: v.number(),
});

const gearPieceValidator = v.object({
  name: v.string(),
  type: v.string(),
  enabled: v.boolean(),
  knobs: v.array(knobValidator),
  patch: v.optional(v.string()),
  patchName: v.optional(v.string()),
  isOverride: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});

const gearSettingsValidator = v.object({
  gear: v.array(gearPieceValidator),
  notes: v.optional(v.string()),
});

/**
 * Update gear settings for a section
 */
export const updateGearSettings = mutation({
  args: {
    id: v.id("songSections"),
    gearSettings: gearSettingsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const section = await ctx.db.get(args.id);
    if (!section || section.deletedAt) {
      throw new Error("Section not found");
    }

    // Verify song access
    await verifySongAccess(ctx, section.songId, userId);

    await ctx.db.patch(args.id, {
      gearSettings: args.gearSettings,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Create a section with gear settings in one call
 */
export const createWithGear = mutation({
  args: {
    songId: v.id("songs"),
    instrument: v.string(),
    name: v.string(),
    notes: v.optional(v.string()),
    gearSettings: v.optional(gearSettingsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify song access
    await verifySongAccess(ctx, args.songId, userId);

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Section name is required");
    }

    // Get existing sections for this instrument to determine position
    const existingSections = await ctx.db
      .query("songSections")
      .withIndex("by_song_instrument", (q) =>
        q.eq("songId", args.songId).eq("instrument", args.instrument)
      )
      .collect();

    const activeSections = existingSections.filter((s) => !s.deletedAt);
    const maxPosition =
      activeSections.length > 0
        ? Math.max(...activeSections.map((s) => s.position))
        : -1;

    const now = Date.now();

    const sectionId = await ctx.db.insert("songSections", {
      songId: args.songId,
      instrument: args.instrument,
      name: args.name.trim(),
      position: maxPosition + 1,
      notes: args.notes?.trim(),
      gearSettings: args.gearSettings,
      createdAt: now,
    });

    return sectionId;
  },
});
