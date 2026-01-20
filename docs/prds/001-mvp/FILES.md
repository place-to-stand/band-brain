# File Uploads & Storage

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md)

## Limits

| Limit | Value | Description |
|-------|-------|-------------|
| **Max file size** | 100MB | Per-file upload limit |
| **User storage quota** | 2GB | Total storage per user |
| **Upload rate limit** | 50/hour | Prevents abuse |

---

## File Upload Flow

1. Client requests upload URL via `generateUploadUrl` mutation
2. Client uploads file directly to Convex storage
3. Client saves file metadata via `saveSongFile` mutation
4. Server validates size and quota
5. Waveform peaks computed asynchronously for audio files

---

## Implementation

### Generate Upload URL (with rate limiting)

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_USER_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_UPLOADS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as Id<"users">;
    const now = Date.now();

    // Check rate limit
    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;

      if (windowExpired) {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: 1,
          windowStart: now,
        });
      } else if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
        throw new Error("Upload rate limit exceeded. Try again later.");
      } else {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        userId,
        uploadCount: 1,
        windowStart: now,
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});
```

### Save Uploaded File (with quota check)

```typescript
export const saveSongFile = mutation({
  args: {
    songId: v.id("songs"),
    storageId: v.id("_storage"),
    fileType: v.string(),
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.number(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject as Id<"users">;

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`File too large. Maximum size is 100MB`);
    }

    // Check user storage quota
    const user = await ctx.db.get(userId);
    const currentUsage = user?.storageUsedBytes || 0;
    if (currentUsage + args.fileSize > MAX_USER_STORAGE_BYTES) {
      await ctx.storage.delete(args.storageId);
      const remainingMB = Math.floor((MAX_USER_STORAGE_BYTES - currentUsage) / 1024 / 1024);
      throw new Error(`Storage quota exceeded. You have ${remainingMB}MB remaining.`);
    }

    // Update user's storage usage
    await ctx.db.patch(userId, {
      storageUsedBytes: currentUsage + args.fileSize,
      updatedAt: Date.now(),
    });

    // Get existing files for versioning
    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    const maxVersion = existingFiles.length > 0
      ? Math.max(...existingFiles.map((f) => f.version))
      : 0;

    return await ctx.db.insert("songFiles", {
      ...args,
      version: maxVersion + 1,
      isPrimary: existingFiles.length === 0,
      createdAt: Date.now(),
    });
  },
});
```

### Save External URL (no upload)

```typescript
export const saveExternalSongFile = mutation({
  args: {
    songId: v.id("songs"),
    externalUrl: v.string(),
    externalService: v.string(), // 'dropbox' | 'youtube' | 'bandcamp' | 'google_drive'
    fileType: v.string(),
    variantLabel: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingFiles = await ctx.db
      .query("songFiles")
      .withIndex("by_song_active", (q) =>
        q.eq("songId", args.songId).eq("deletedAt", undefined)
      )
      .collect();

    const maxVersion = existingFiles.length > 0
      ? Math.max(...existingFiles.map((f) => f.version))
      : 0;

    return await ctx.db.insert("songFiles", {
      songId: args.songId,
      externalUrl: args.externalUrl,
      externalService: args.externalService,
      fileType: args.fileType,
      variantLabel: args.variantLabel,
      fileName: args.fileName,
      version: maxVersion + 1,
      isPrimary: existingFiles.length === 0,
      createdAt: Date.now(),
    });
  },
});
```

---

## Waveform Pre-computation

```typescript
// convex/waveform.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const computeWaveform = action({
  args: {
    storageId: v.id("_storage"),
    targetTable: v.string(), // 'songFiles' or 'bounces'
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found");

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    // In production, use proper audio decoding library
    const peaks = computePeaksFromBuffer(arrayBuffer);

    await ctx.runMutation(internal.waveform.savePeaks, {
      targetTable: args.targetTable,
      targetId: args.targetId,
      peaks,
    });

    return peaks;
  },
});

export const savePeaks = internalMutation({
  args: {
    targetTable: v.string(),
    targetId: v.string(),
    peaks: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.targetTable === "songFiles") {
      await ctx.db.patch(args.targetId as any, {
        waveformPeaks: args.peaks,
      });
    } else if (args.targetTable === "bounces") {
      await ctx.db.patch(args.targetId as any, {
        waveformPeaks: args.peaks,
      });
    }
  },
});

function computePeaksFromBuffer(buffer: ArrayBuffer): number[] {
  // Placeholder - use proper audio decoding in production
  const numPeaks = 200;
  return Array.from({ length: numPeaks }, () => Math.random());
}
```

---

## Client-Side Upload Hook

```typescript
// hooks/useFileUpload.ts
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useFileUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Validate file size client-side
        const MAX_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          throw new Error(`File too large. Maximum size is 100MB.`);
        }

        const uploadUrl = await generateUploadUrl();

        // Upload with progress tracking
        const xhr = new XMLHttpRequest();

        const storageId = await new Promise<string>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setState((s) => ({ ...s, progress: (e.loaded / e.total) * 100 }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.storageId);
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setState({ isUploading: false, progress: 100, error: null });
        return storageId;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setState({ isUploading: false, progress: 0, error });
        return null;
      }
    },
    [generateUploadUrl]
  );

  return { ...state, upload };
}
```

---

## Supported File Types

| Type | Extensions | Use Case |
|------|------------|----------|
| `audio` | mp3, wav, flac, m4a | Song recordings, stems |
| `video` | mp4, mov, webm | Performance videos |
| `chart` | pdf, png, jpg | Chord charts, lead sheets |
| `tab` | txt | Text tablature |
| `gp` | gp, gpx, gp5 | Guitar Pro files |
| `stem` | wav, flac | Individual instrument tracks |
| `other` | any | Miscellaneous files |

---

## External Services

| Service | URL Pattern |
|---------|-------------|
| `dropbox` | dropbox.com/* |
| `youtube` | youtube.com/*, youtu.be/* |
| `bandcamp` | *.bandcamp.com/* |
| `google_drive` | drive.google.com/* |
| `other` | Any other URL |
