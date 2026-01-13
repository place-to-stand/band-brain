import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============ QUERIES ============

export const getDailyLick = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;

    // Get today's date as a string for comparison
    const today = new Date().toISOString().split("T")[0];

    // Check if user already has a lick for today
    const history = await ctx.db
      .query("dailyLickHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    if (history) {
      // Return the already shown lick
      return await ctx.db.get(history.lickId);
    }

    // Find a curated lick that hasn't been shown to this user recently
    const recentHistory = await ctx.db
      .query("dailyLickHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30); // Last 30 licks shown

    const recentLickIds = new Set(recentHistory.map((h) => h.lickId));

    // Get all curated licks
    const curatedLicks = await ctx.db
      .query("licks")
      .withIndex("by_source", (q) => q.eq("source", "curated"))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Find one that hasn't been shown recently
    const availableLicks = curatedLicks.filter(
      (lick) => !recentLickIds.has(lick._id)
    );

    if (availableLicks.length === 0) {
      // All licks have been shown, start over with oldest
      return curatedLicks[0] ?? null;
    }

    // Pick a random one from available
    const randomIndex = Math.floor(Math.random() * availableLicks.length);
    return availableLicks[randomIndex];
  },
});

export const listUserLicks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("licks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(limit);
  },
});

export const getById = query({
  args: { id: v.id("licks") },
  handler: async (ctx, args) => {
    const lick = await ctx.db.get(args.id);
    if (!lick || lick.deletedAt) return null;
    return lick;
  },
});

export const listByStyle = query({
  args: {
    style: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 20;

    return await ctx.db
      .query("licks")
      .withIndex("by_style", (q) => q.eq("style", args.style))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(limit);
  },
});

// ============ MUTATIONS ============

export const saveLick = mutation({
  args: {
    title: v.string(),
    style: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    alphaTex: v.optional(v.string()),
    tabFileId: v.optional(v.id("_storage")),
    audioFileId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const now = Date.now();
    return await ctx.db.insert("licks", {
      userId,
      source: "user",
      title: args.title,
      style: args.style,
      difficulty: args.difficulty,
      key: args.key,
      tempo: args.tempo,
      timeSignature: args.timeSignature,
      alphaTex: args.alphaTex,
      tabFileId: args.tabFileId,
      audioFileId: args.audioFileId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLick = mutation({
  args: {
    id: v.id("licks"),
    title: v.optional(v.string()),
    style: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    key: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    alphaTex: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const lick = await ctx.db.get(args.id);
    if (!lick || lick.deletedAt) {
      throw new Error("Lick not found");
    }

    // Users can only edit their own licks
    if (lick.userId !== userId && lick.source !== "user") {
      throw new Error("Cannot edit this lick");
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
  args: { id: v.id("licks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const lick = await ctx.db.get(args.id);
    if (!lick || lick.deletedAt) {
      throw new Error("Lick not found");
    }

    // Users can only delete their own licks
    if (lick.userId !== userId) {
      throw new Error("Cannot delete this lick");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const recordDailyLickView = mutation({
  args: { lickId: v.id("licks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    const today = new Date().toISOString().split("T")[0];

    // Check if already recorded for today
    const existing = await ctx.db
      .query("dailyLickHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("dailyLickHistory", {
      userId,
      lickId: args.lickId,
      date: today,
      viewedAt: Date.now(),
    });
  },
});

// ============ AI GENERATION ============

export const checkAiRateLimit = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, remaining: 0 };
    const userId = identity.subject as Id<"users">;

    const MAX_GENERATIONS_PER_DAY = 5;
    const today = new Date().toISOString().split("T")[0];

    const limit = await ctx.db
      .query("aiGenerationLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!limit || limit.date !== today) {
      return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY };
    }

    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - limit.count);
    return { allowed: remaining > 0, remaining };
  },
});

export const incrementAiGenerationCount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const limit = await ctx.db
      .query("aiGenerationLimits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!limit) {
      await ctx.db.insert("aiGenerationLimits", {
        userId: args.userId,
        date: today,
        count: 1,
      });
    } else if (limit.date !== today) {
      await ctx.db.patch(limit._id, {
        date: today,
        count: 1,
      });
    } else {
      await ctx.db.patch(limit._id, {
        count: limit.count + 1,
      });
    }
  },
});

export const saveGeneratedLick = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    style: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
    tempo: v.optional(v.number()),
    timeSignature: v.optional(v.string()),
    alphaTex: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("licks", {
      userId: args.userId,
      source: "ai",
      title: args.title,
      style: args.style,
      difficulty: args.difficulty,
      key: args.key,
      tempo: args.tempo,
      timeSignature: args.timeSignature,
      alphaTex: args.alphaTex,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const generateAiLick = action({
  args: {
    style: v.string(),
    difficulty: v.number(),
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Check rate limit
    const rateLimit = await ctx.runQuery(internal.licks.checkAiRateLimitInternal, {
      userId,
    });

    if (!rateLimit.allowed) {
      throw new Error("Daily AI generation limit reached. Try again tomorrow.");
    }

    // Generate lick using Claude API
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error("AI generation not configured");
    }

    const keyContext = args.key ? `in the key of ${args.key}` : "";
    const difficultyDesc =
      args.difficulty <= 2
        ? "beginner"
        : args.difficulty <= 4
          ? "intermediate"
          : args.difficulty <= 6
            ? "advanced"
            : "expert";

    const prompt = `Generate a short guitar lick in ${args.style} style ${keyContext} at ${difficultyDesc} difficulty level.

Return ONLY valid alphaTex notation that can be rendered by AlphaTab. The lick should be 1-2 bars.

Example format:
\\tempo 120
.
:4 3.3 5.3 7.3 5.3 | 3.3 5.3 7.3 8.3

Requirements:
- Use standard guitar tablature notation
- Include tempo marking
- Keep it musical and idiomatic for ${args.style}
- Make it appropriate for ${difficultyDesc} level players

Return ONLY the alphaTex code, no explanations.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate lick");
    }

    const data = await response.json();
    const alphaTex = data.content[0]?.text?.trim();

    if (!alphaTex) {
      throw new Error("No lick generated");
    }

    // Increment rate limit
    await ctx.runMutation(internal.licks.incrementAiGenerationCount, { userId });

    // Save the generated lick
    const lickId = await ctx.runMutation(internal.licks.saveGeneratedLick, {
      userId,
      title: `AI ${args.style} Lick`,
      style: args.style,
      difficulty: args.difficulty,
      key: args.key,
      tempo: 120,
      timeSignature: "4/4",
      alphaTex,
    });

    return { lickId, alphaTex };
  },
});

// Internal query for rate limit check (used by action)
export const checkAiRateLimitInternal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const MAX_GENERATIONS_PER_DAY = 5;
    const today = new Date().toISOString().split("T")[0];

    const limit = await ctx.db
      .query("aiGenerationLimits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!limit || limit.date !== today) {
      return { allowed: true, remaining: MAX_GENERATIONS_PER_DAY };
    }

    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - limit.count);
    return { allowed: remaining > 0, remaining };
  },
});
