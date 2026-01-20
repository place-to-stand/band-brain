# Setlists

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md) | [GEAR.md](./GEAR.md)

## Overview

Setlists help bands organize songs for shows with:
- **Duration tracking** → Auto-calculated from song lengths
- **Starting gear** → Per-song gear configuration snapshots
- **Computed gear deltas** → What to change between songs
- **Drag-and-drop reordering**

---

## Data Model

### Setlist

```typescript
{
  userId: Id<"users">,
  bandId: Id<"bands">,
  name: string,
  description?: string,
  showDate?: number, // Timestamp
  venue?: string,
  totalDurationSeconds: number, // Auto-computed
}
```

### Setlist Item

```typescript
{
  setlistId: Id<"setlists">,
  songId: Id<"songs">,
  position: number,
  gearSnapshot?: GearSettings, // Captured gear state at add time
  transitionNotes?: string,
}
```

---

## Duration Calculation

Total setlist duration is computed from:
1. Sum of all song `durationSeconds` values
2. Buffer time between songs (30 seconds default)

```typescript
// convex/setlists.ts

export const computeDuration = internalMutation({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const songIds = items.map((item) => item.songId);
    const songs = await Promise.all(songIds.map((id) => ctx.db.get(id)));

    const BUFFER_SECONDS = 30;
    const totalSeconds = songs.reduce((total, song, index) => {
      const duration = song?.durationSeconds || 0;
      const buffer = index < songs.length - 1 ? BUFFER_SECONDS : 0;
      return total + duration + buffer;
    }, 0);

    await ctx.db.patch(args.setlistId, {
      totalDurationSeconds: totalSeconds,
      updatedAt: Date.now(),
    });
  },
});

// Helper function for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
```

---

## Gear Snapshots

When a song is added to a setlist, the current gear settings are captured:

```typescript
export const addSong = mutation({
  args: {
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get existing items for position
    const existingItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Get song's starting gear settings (first section)
    const song = await ctx.db.get(args.songId);
    const sections = await ctx.db
      .query("songSections")
      .withIndex("by_song", (q) => q.eq("songId", args.songId))
      .filter((q) => q.eq(q.field("position"), 0))
      .first();

    const itemId = await ctx.db.insert("setlistItems", {
      setlistId: args.setlistId,
      songId: args.songId,
      position: existingItems.length,
      gearSnapshot: sections?.gearSettings,
      createdAt: Date.now(),
    });

    // Recompute duration
    await ctx.scheduler.runAfter(0, internal.setlists.computeDuration, {
      setlistId: args.setlistId,
    });

    return itemId;
  },
});
```

---

## Computed Gear Deltas

Gear changes between songs are **computed at display time**, not stored:

```typescript
// lib/setlist/gearDelta.ts

interface GearDelta {
  added: GearPiece[];      // Gear pieces turned on
  removed: GearPiece[];    // Gear pieces turned off
  changed: {               // Gear with knob changes
    piece: GearPiece;
    knobChanges: {
      label: string;
      from: number;
      to: number;
    }[];
  }[];
}

export function computeGearDelta(
  fromGear: GearSettings | undefined,
  toGear: GearSettings | undefined
): GearDelta {
  const delta: GearDelta = { added: [], removed: [], changed: [] };

  if (!fromGear && !toGear) return delta;
  if (!fromGear && toGear) {
    delta.added = toGear.gear.filter((g) => g.enabled);
    return delta;
  }
  if (fromGear && !toGear) {
    delta.removed = fromGear.gear.filter((g) => g.enabled);
    return delta;
  }

  const fromMap = new Map(fromGear!.gear.map((g) => [g.name, g]));
  const toMap = new Map(toGear!.gear.map((g) => [g.name, g]));

  // Check each piece in the destination
  for (const [name, toPiece] of toMap) {
    const fromPiece = fromMap.get(name);

    if (!fromPiece) {
      // New piece
      if (toPiece.enabled) delta.added.push(toPiece);
    } else if (!fromPiece.enabled && toPiece.enabled) {
      // Turned on
      delta.added.push(toPiece);
    } else if (fromPiece.enabled && !toPiece.enabled) {
      // Turned off
      delta.removed.push(toPiece);
    } else if (fromPiece.enabled && toPiece.enabled) {
      // Both enabled - check for knob changes
      const knobChanges = findKnobChanges(fromPiece.knobs, toPiece.knobs);
      if (knobChanges.length > 0) {
        delta.changed.push({ piece: toPiece, knobChanges });
      }
    }
  }

  // Check for pieces removed entirely
  for (const [name, fromPiece] of fromMap) {
    if (!toMap.has(name) && fromPiece.enabled) {
      delta.removed.push(fromPiece);
    }
  }

  return delta;
}

function findKnobChanges(
  fromKnobs: Knob[],
  toKnobs: Knob[]
): { label: string; from: number; to: number }[] {
  const changes: { label: string; from: number; to: number }[] = [];
  const fromMap = new Map(fromKnobs.map((k) => [k.label, k.position]));

  for (const toKnob of toKnobs) {
    const fromPos = fromMap.get(toKnob.label);
    if (fromPos !== undefined && Math.abs(fromPos - toKnob.position) > 0.05) {
      changes.push({
        label: toKnob.label,
        from: fromPos,
        to: toKnob.position,
      });
    }
  }

  return changes;
}
```

---

## Setlist View Component

```typescript
// components/setlist/SetlistView.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeGearDelta, formatDuration } from "@/lib/setlist";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface SetlistViewProps {
  setlistId: string;
}

export function SetlistView({ setlistId }: SetlistViewProps) {
  const setlist = useQuery(api.setlists.get, { setlistId });
  const items = useQuery(api.setlists.getItems, { setlistId });
  const reorder = useMutation(api.setlists.reorderItems);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items?.findIndex((i) => i._id === active.id);
      const newIndex = items?.findIndex((i) => i._id === over.id);
      if (oldIndex !== undefined && newIndex !== undefined) {
        await reorder({ setlistId, oldIndex, newIndex });
      }
    }
  };

  if (!setlist || !items) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{setlist.name}</h1>
          {setlist.venue && (
            <p className="text-muted-foreground">{setlist.venue}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono">
            {formatDuration(setlist.totalDurationSeconds)}
          </p>
          <p className="text-sm text-muted-foreground">
            {items.length} songs
          </p>
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => {
              const prevItem = index > 0 ? items[index - 1] : undefined;
              const gearDelta = computeGearDelta(
                prevItem?.gearSnapshot,
                item.gearSnapshot
              );

              return (
                <SetlistItemCard
                  key={item._id}
                  item={item}
                  position={index + 1}
                  gearDelta={gearDelta}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

---

## Gear Delta Display

```typescript
// components/setlist/GearDeltaDisplay.tsx
"use client";

import { GearDelta } from "@/lib/setlist/gearDelta";
import { KnobDial } from "@/components/gear/KnobDial";

interface GearDeltaDisplayProps {
  delta: GearDelta;
}

export function GearDeltaDisplay({ delta }: GearDeltaDisplayProps) {
  const hasChanges =
    delta.added.length > 0 ||
    delta.removed.length > 0 ||
    delta.changed.length > 0;

  if (!hasChanges) return null;

  return (
    <div className="bg-muted/50 rounded p-3 text-sm space-y-2">
      <p className="font-medium text-muted-foreground">Gear Changes:</p>

      {delta.added.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {delta.added.map((piece) => (
            <span
              key={piece.name}
              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
            >
              + {piece.name}
            </span>
          ))}
        </div>
      )}

      {delta.removed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {delta.removed.map((piece) => (
            <span
              key={piece.name}
              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
            >
              − {piece.name}
            </span>
          ))}
        </div>
      )}

      {delta.changed.map(({ piece, knobChanges }) => (
        <div key={piece.name} className="border-t pt-2">
          <p className="font-medium">{piece.name}</p>
          <div className="flex flex-wrap gap-4 mt-2">
            {knobChanges.map((change) => (
              <div key={change.label} className="flex items-center gap-2">
                <KnobDial
                  label={change.label}
                  value={change.from}
                  onChange={() => {}}
                  disabled
                />
                <span className="text-muted-foreground">→</span>
                <KnobDial
                  label={change.label}
                  value={change.to}
                  onChange={() => {}}
                  disabled
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Reordering Songs

```typescript
// convex/setlists.ts

export const reorderItems = mutation({
  args: {
    setlistId: v.id("setlists"),
    oldIndex: v.number(),
    newIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Sort by current position
    items.sort((a, b) => a.position - b.position);

    // Reorder array
    const [movedItem] = items.splice(args.oldIndex, 1);
    items.splice(args.newIndex, 0, movedItem);

    // Update all positions
    await Promise.all(
      items.map((item, index) =>
        ctx.db.patch(item._id, {
          position: index,
          updatedAt: Date.now(),
        })
      )
    );
  },
});
```

---

## Transition Notes

Users can add notes for song transitions:

```typescript
export const updateTransitionNotes = mutation({
  args: {
    itemId: v.id("setlistItems"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.itemId, {
      transitionNotes: args.notes,
      updatedAt: Date.now(),
    });
  },
});
```

Example transition notes:
- "Capo on 2nd fret"
- "Switch to drop D tuning"
- "Enable delay pedal before starting"
- "Count in at 140 BPM"
