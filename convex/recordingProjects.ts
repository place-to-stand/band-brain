import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type ProjectStatus = "pre_production" | "tracking" | "mixing" | "mastering" | "complete";

// ============ QUERIES ============

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    let projects = await ctx.db
      .query("recordingProjects")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("deletedAt", undefined)
      )
      .order("desc")
      .collect();

    if (args.status) {
      projects = projects.filter((p) => p.status === args.status);
    }

    return projects;
  },
});

export const getById = query({
  args: { id: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      return null;
    }

    return project;
  },
});

export const getWithSongs = query({
  args: { id: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      return null;
    }

    // Get songs in this project
    const songs = await ctx.db
      .query("recordingSongs")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Sort by position
    songs.sort((a, b) => a.position - b.position);

    return {
      ...project,
      songs,
    };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    name: v.string(),
    bandId: v.optional(v.id("bands")),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Verify band belongs to user if provided
    if (args.bandId) {
      const band = await ctx.db.get(args.bandId);
      if (!band || band.deletedAt || band.userId !== userId) {
        throw new Error("Band not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("recordingProjects", {
      userId,
      bandId: args.bandId,
      name: args.name,
      status: (args.status as ProjectStatus) ?? "pre_production",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("recordingProjects"),
    name: v.optional(v.string()),
    bandId: v.optional(v.id("bands")),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    // Verify band belongs to user if changing
    if (args.bandId) {
      const band = await ctx.db.get(args.bandId);
      if (!band || band.deletedAt || band.userId !== userId) {
        throw new Error("Band not found");
      }
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

export const updateStatus = mutation({
  args: {
    id: v.id("recordingProjects"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status as ProjectStatus,
      updatedAt: Date.now(),
    });
  },
});

export const softDelete = mutation({
  args: { id: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restore = mutation({
  args: { id: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ============ RECORDING SONGS ============

export const listSongsByProject = query({
  args: { projectId: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const songs = await ctx.db
      .query("recordingSongs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Sort by position
    songs.sort((a, b) => a.position - b.position);

    return songs;
  },
});

export const addSongToProject = mutation({
  args: {
    projectId: v.id("recordingProjects"),
    title: v.string(),
    sourceSongId: v.optional(v.id("songs")),
    mixNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    // Get current song count for position
    const existingSongs = await ctx.db
      .query("recordingSongs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const position = existingSongs.length;
    const now = Date.now();

    return await ctx.db.insert("recordingSongs", {
      projectId: args.projectId,
      title: args.title,
      sourceSongId: args.sourceSongId,
      mixNotes: args.mixNotes,
      position,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeSongFromProject = mutation({
  args: { id: v.id("recordingSongs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const song = await ctx.db.get(args.id);
    if (!song || song.deletedAt) {
      throw new Error("Song not found");
    }

    // Verify project ownership
    const project = await ctx.db.get(song.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Reorder remaining songs
    const remainingSongs = await ctx.db
      .query("recordingSongs")
      .withIndex("by_project", (q) => q.eq("projectId", song.projectId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    remainingSongs.sort((a, b) => a.position - b.position);

    for (let i = 0; i < remainingSongs.length; i++) {
      if (remainingSongs[i].position !== i) {
        await ctx.db.patch(remainingSongs[i]._id, { position: i });
      }
    }
  },
});

export const reorderSongs = mutation({
  args: {
    projectId: v.id("recordingProjects"),
    songIds: v.array(v.id("recordingSongs")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    // Update positions based on new order
    for (let i = 0; i < args.songIds.length; i++) {
      await ctx.db.patch(args.songIds[i], { position: i });
    }
  },
});

// ============ TRACKING GRID ============

export const getTrackingGrid = query({
  args: { projectId: v.id("recordingProjects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("trackingGrid")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const updateTrackStatus = mutation({
  args: {
    projectId: v.id("recordingProjects"),
    songId: v.id("recordingSongs"),
    instrument: v.string(),
    status: v.string(),
    performer: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.deletedAt || project.userId !== userId) {
      throw new Error("Recording project not found");
    }

    // Check if track cell exists
    const existing = await ctx.db
      .query("trackingGrid")
      .withIndex("by_song_instrument", (q) =>
        q.eq("songId", args.songId).eq("instrument", args.instrument)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        performer: args.performer,
        notes: args.notes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("trackingGrid", {
        projectId: args.projectId,
        songId: args.songId,
        instrument: args.instrument,
        status: args.status,
        performer: args.performer,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
