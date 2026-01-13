# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start Next.js development server
- `npx convex dev` - Start Convex dev server (run in separate terminal)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler checks (no emit)

### Testing
- `npm run test` - Run Vitest unit tests
- `npm run test:e2e` - Run Playwright E2E tests

### Convex
- `npx convex deploy` - Deploy Convex functions to production
- `npx convex dev --once` - Run Convex schema push once (no watch)

**Development workflow:**
1. Start Convex dev server: `npx convex dev`
2. Start Next.js dev server: `npm run dev`
3. Both servers must be running for full functionality

**Schema changes:**
1. Update schema in `convex/schema.ts`
2. Convex dev server automatically syncs schema changes
3. For production: `npx convex deploy`

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: Convex (reactive database with realtime subscriptions)
- **Auth**: Convex Auth with Password provider
- **Storage**: Convex Storage (built-in file storage)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Tab Rendering**: AlphaTab (lazy loaded)
- **Waveform**: wavesurfer.js
- **Error Tracking**: PostHog
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel (Next.js) + Convex Cloud (backend)

### Route Organization
```
app/
├── (auth)/           # Sign-in, sign-up, password reset (unauthenticated)
├── (dashboard)/      # Protected routes
│   ├── bands/        # Band management
│   ├── learning/     # Personal learning projects
│   ├── recording/    # Recording project management
│   ├── setlists/     # Setlist builder
│   ├── training/     # Practice tools (metronome, drone, licks)
│   ├── practice-log/ # Practice session history
│   └── settings/     # User settings, data export
└── api/              # API routes (if needed)
```

### Database Schema

**Core tables** (`convex/schema.ts`):
- `users` - User accounts
- `bands` - Bands with member info and instruments
- `songs` - Songs with key, tempo, time signature, practice status
- `songFiles` - File attachments for songs (audio, tabs, charts)
- `instrumentParts` - Per-instrument settings and notes for songs
- `learningProjects` - Personal repertoire/exercises
- `learningProjectFiles` - Files for learning projects
- `recordingProjects` - Recording session management
- `recordingSongs` - Songs within recording projects
- `trackingGrid` - Instrument tracking status per song
- `bounces` - Mix bounces with waveform data
- `bounceComments` - Timestamped comments on bounces
- `setlists` - Setlists with duration calculation
- `setlistItems` - Songs in setlists with gear snapshots
- `practiceSessions` - Practice session logs
- `licks` - Lick database (curated, user, AI-generated)
- `dailyLickHistory` - Tracks shown daily licks
- `uploadRateLimits` - Rate limiting for file uploads
- `aiGenerationLimits` - Rate limiting for AI lick generation

**Key patterns:**
- Soft deletes via `deletedAt` timestamps on all core tables
- `createdAt`/`updatedAt` on all records
- Versioned JSON for gear settings (`schemaVersion` field)
- File size tracking on all file records
- Indexes on foreign keys and common query patterns

### Convex Data Layer

**Function types:**
- `query` - Read-only, reactive (auto-updates UI on changes)
- `mutation` - Write operations, transactional
- `action` - Side effects (external APIs, file processing)
- `internalMutation`/`internalQuery` - Called only from other functions

**File organization:**
```
convex/
├── schema.ts         # Database schema definition
├── auth.ts           # Convex Auth configuration
├── auth.config.ts    # Auth provider config
├── users.ts          # User queries/mutations
├── bands.ts          # Band operations
├── songs.ts          # Song CRUD
├── files.ts          # File upload/management
├── waveform.ts       # Waveform computation
├── learningProjects.ts
├── recordingProjects.ts
├── bounces.ts
├── setlists.ts
├── practiceSessions.ts
├── licks.ts          # Daily lick & AI generation
├── export.ts         # Data export
└── http.ts           # HTTP endpoints (if needed)
```

**Querying pattern:**
```typescript
// In components - use hooks for reactive data
const songs = useQuery(api.songs.listByBand, { bandId });

// In mutations/actions - use ctx.db directly
const song = await ctx.db.get(songId);
const songs = await ctx.db
  .query("songs")
  .withIndex("by_band_active", q => q.eq("bandId", bandId).eq("deletedAt", undefined))
  .collect();
```

### Authentication

**Convex Auth setup** (`convex/auth.ts`):
- Password provider with email/password authentication
- Session-based authentication
- Optional password reset via Resend email provider

**Client-side hooks:**
```typescript
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const { isAuthenticated, isLoading } = useConvexAuth();
const user = useQuery(api.users.current);
```

**Server-side auth check:**
```typescript
// In Convex functions
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
const userId = identity.subject as Id<"users">;
```

### File Storage

**Convex Storage setup:**
- Built-in file storage, no separate bucket configuration
- Max file size: 100MB
- Rate limit: 50 uploads per hour per user

**Upload flow:**
1. Client requests upload URL via `generateUploadUrl` mutation
2. Client uploads file directly to Convex storage
3. Client saves file metadata via mutation (validates size, creates record)
4. Waveform peaks computed asynchronously for audio files

**Storage utilities:**
- `convex/files.ts` - Upload URL generation, file saving with validation
- `convex/waveform.ts` - Waveform peak computation

### State Management

**Convex-first pattern:**
- Use Convex queries for all server state (reactive by default)
- No need for React Query or SWR - Convex handles caching and updates
- Local UI state with React useState/useReducer
- Optimistic updates handled by Convex mutations

**Data flow:**
```
User Action → Mutation → Database Update → Query Re-runs → UI Updates
```

### Error Handling

**Client-side:**
- ErrorBoundary component wraps app sections
- PostHog captures unhandled errors
- `useMutationWithRetry` hook for automatic retry with backoff

**Server-side (Convex):**
- Throw errors in mutations/queries for validation failures
- Use try/catch in actions for external API calls
- Rate limit errors return user-friendly messages

**Error patterns:**
```typescript
// Validation error
if (args.fileSize > MAX_FILE_SIZE_BYTES) {
  throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
}

// Auth error
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

// Rate limit error
if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR) {
  throw new Error("Upload rate limit exceeded. Try again later.");
}
```

### UI Components

**Component library:**
- shadcn/ui components in `components/ui/`
- Custom components organized by feature in `components/`
- AlphaTab viewer: lazy loaded, only imports when needed
- wavesurfer.js: for audio waveform visualization

**Form handling:**
- React Hook Form for form state
- Zod for validation schemas

**Key custom components:**
- `components/audio/WaveformPlayer.tsx` - Audio playback with waveform
- `components/tab/AlphaTabViewer.tsx` - Guitar Pro/alphaTex rendering
- `components/training/Metronome.tsx` - Metronome with song linking
- `components/training/DronePlayer.tsx` - Drone/backing track player
- `components/recording/TrackingGrid.tsx` - Recording status grid
- `components/ErrorBoundary.tsx` - Global error boundary

### Music-Specific Features

**Gear settings:**
- Versioned JSON structure with `schemaVersion` field
- Pedal chains, amp settings, synth patches
- Gear snapshots saved per setlist item

**Setlist duration:**
- Automatically calculated from song durations
- Includes buffer time between songs (30 seconds default)
- Updated when songs added/removed/reordered

**Transposition helper:**
- `lib/music/transposition.ts` - Chord transposition utilities
- Handles both sharp and flat notation

**Practice tools:**
- Metronome auto-configures from song tempo/time signature
- Drone player auto-configures from song key/mode
- Daily lick system with curated and AI-generated options

### Key Patterns & Conventions

**Soft deletes:**
- All core entities use `deletedAt` timestamps
- Active records: filter with `.eq("deletedAt", undefined)`
- Archive/restore via setting/clearing `deletedAt`
- Never hard delete records

**File size tracking:**
- All file records include `fileSize` field
- Validated client-side AND server-side
- Enables storage cost monitoring

**Versioned settings:**
- Gear settings include `schemaVersion` number
- Allows schema evolution without breaking existing data

**Lazy loading:**
- AlphaTab only imported on pages that need tab rendering
- Keeps initial bundle size small

**Type safety:**
- TypeScript strict mode
- Zod schemas for runtime validation
- Convex generates types from schema

## Common Workflows

### Adding a new table
1. Define table in `convex/schema.ts`
2. Add indexes for common query patterns
3. Run `npx convex dev` to sync schema
4. Create queries/mutations in new file under `convex/`
5. Export from appropriate index files

### Creating a new protected page
1. Add page under `app/(dashboard)/your-route/page.tsx`
2. Use `useConvexAuth()` hook to check auth status
3. Use `useQuery()` hooks to fetch data
4. Add navigation link if needed

### Adding a file upload feature
1. Use `generateUploadUrl` mutation to get upload URL
2. Upload file directly to Convex storage
3. Call save mutation with storageId and metadata
4. Validate file size in mutation
5. Trigger waveform computation if audio file

### Implementing soft delete
```typescript
export const softDelete = mutation({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### Querying active records only
```typescript
const activeRecords = await ctx.db
  .query("tableName")
  .withIndex("by_user_active", q =>
    q.eq("userId", userId).eq("deletedAt", undefined)
  )
  .collect();
```

## Development Standards

**Code quality:**
- Run `npm run lint` and `npm run type-check` before committing
- Files approaching 300 lines should be split by responsibility
- Prefer existing utilities and shadcn components before building new

**Database operations:**
- Always use soft deletes, never hard delete
- Include `createdAt` and `updatedAt` on all records
- Add indexes for query patterns used in production

**File handling:**
- Validate file size client-side before upload
- Validate again server-side in save mutation
- Track file sizes for storage monitoring

**Error handling:**
- Wrap risky operations in try/catch
- Report errors to PostHog
- Return user-friendly error messages

**Performance:**
- Lazy load heavy libraries (AlphaTab)
- Pre-compute waveform peaks on upload
- Use Convex indexes for query optimization

## Environment Variables

```bash
# .env.local

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Convex Auth (generate with: openssl rand -base64 32)
CONVEX_AUTH_SECRET=your-secret-here

# Email (for password reset - optional for MVP)
# RESEND_API_KEY=re_xxxxx

# AI Generation
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Error Tracking & Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Site URL (for auth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Testing

**Convex function tests** (`convex/tests/`):
- Use `convex-test` library
- Test mutations and queries in isolation
- Mock external dependencies

**Component tests** (`__tests__/`):
- Vitest + Testing Library
- Mock Convex client for isolated tests
- Test component rendering and interactions

**E2E tests** (`e2e/`):
- Playwright for full user flows
- Test authentication, CRUD operations
- Run against dev environment
