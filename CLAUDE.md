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
- **Waveform**: wavesurfer.js
- **Analytics & Monitoring**: PostHog (client and server-side)
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
│   ├── training/     # Practice tools (metronome, drone)
│   ├── practice-log/ # Practice session history
│   └── settings/     # User settings, data export
└── api/              # API routes (if needed)
```

### Database Schema

**Core tables** (`convex/schema.ts`):
- `users` - User accounts
- `bands` - Personal song collections (single-user ownership, no sharing)
- `songs` - Songs with key, tempo, time signature, practice status
- `songFiles` - File attachments for songs (audio, charts)
- `songSections` - Sections within songs with gear settings
- `recordingProjects` - Recording session management
- `recordingSongs` - Songs within recording projects
- `trackingGrid` - Instrument tracking status per song
- `bounces` - Mix bounces with waveform data
- `bounceComments` - Timestamped comments on bounces
- `setlists` - Setlists with duration calculation
- `setlistItems` - Songs in setlists with gear snapshots
- `practiceSessions` - Practice session logs
- `uploadRateLimits` - Rate limiting for file uploads

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
├── bands.ts          # Band operations (single-user ownership)
├── songs.ts          # Song CRUD
├── songSections.ts   # Song section management with gear settings
├── files.ts          # File upload/management
├── waveform.ts       # Waveform computation
├── recordingProjects.ts
├── bounces.ts
├── setlists.ts
├── practiceSessions.ts
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
- PostHog captures errors and user analytics
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
- wavesurfer.js: for audio waveform visualization

**Form handling:**
- React Hook Form for form state
- Zod for validation schemas

**Key custom components:**
- `components/audio/WaveformPlayer.tsx` - Audio playback with waveform
- `components/training/Metronome.tsx` - Metronome with song linking
- `components/training/DronePlayer.tsx` - Drone/backing track player
- `components/gear/SectionGearManager.tsx` - Per-section gear settings
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
- Heavy libraries loaded only when needed
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

See `AGENTS.md` for comprehensive development practices including:
- LLM implementation workflow (read first, clarify scope, design before code)
- Development practices (modular architecture, SRP, DRY, git hygiene)
- Non-functional requirements (accessibility, performance, security)
- Observability and operations guidelines

**Key guardrails from AGENTS.md:**
- Do not edit `package.json`, lockfiles, or schema directly without prescribed CLIs
- Always run `npm run build`, `npm run lint`, `npm run type-check` for touched surfaces
- Prefer existing modules, utilities, and shadcn components before building new
- Files approaching 300 lines should be split by responsibility

**Dependency management:**
- Install new packages via `npm install <package>@latest` and record rationale in PRs
- Remove unused dependencies promptly

**Component strategy:**
- Use `npx shadcn@latest add <component>` before building custom UI
- Extend via composition rather than heavy overrides

**Code quality:**
- Run `npm run lint` and `npm run type-check` before committing
- Files approaching 300 lines should be split by responsibility

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
- Pre-compute waveform peaks on upload
- Use Convex indexes for query optimization
- Bundle splitting for heavy libraries

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

# AI Generation (via Vercel AI Gateway)
# Configure in Vercel project settings

# Analytics & Monitoring
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

## Review Skills

Custom skills available for code quality reviews. Invoke with `/skill-name`:

### Code Quality Reviews
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/security-review` | OWASP Top 10, auth/authz audit | Before merging security-sensitive changes |
| `/performance-review` | Core Web Vitals, React patterns, Convex queries | After adding components or data fetching |
| `/convex-review` | Schema design, indexing, query patterns | After schema changes or new tables |
| `/accessibility-review` | WCAG 2.1 AA compliance | After UI changes |
| `/refactor` | Dead code, duplication, complexity | During cleanup sprints |
| `/bug-hunt` | Logic errors, async issues, edge cases | Investigating bugs or reviewing complex logic |

### System Health Reviews
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/architecture-review` | Module boundaries, coupling, data flow | Planning features, system feels tangled |
| `/dependency-audit` | npm security, outdated packages, licenses | Before releases, security hygiene |
| `/observability-review` | Logging, error tracking, monitoring | After incidents, debugging is hard |
| `/tech-debt-inventory` | Catalog and prioritize technical debt | Planning cycles, quarterly reviews |

### Documentation & Release
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/test-plan` | Manual test case generation | Before releases or feature completion |
| `/docs` | API/component documentation | After adding public interfaces |
| `/release-checklist` | Pre-deploy verification, rollback plan | Before production deployments |

**Built-in PR review** (via plugins):
- `/review-pr` - Comprehensive PR review using multiple specialized agents
- `/code-review` - Single-pass code review

### Running Reviews

```bash
# Review staged changes
/security-review  # then describe: "Review staged changes"

# Review specific files
/performance-review  # then describe: "Review components/dashboard/"

# Review Convex schema
/convex-review  # then describe: "Review convex/schema.ts"

# Review a PR
/review-pr 123  # Reviews PR #123

# System-level reviews
/architecture-review  # then describe: "Review the data layer"
/dependency-audit     # runs npm audit and analyzes results
/release-checklist    # pre-deployment verification
```

## Subagents

The following specialized agents are available via the Task tool:

| Agent | Purpose |
|-------|---------|
| `feature-dev:code-reviewer` | Reviews for bugs, security, code quality |
| `feature-dev:code-explorer` | Deep codebase analysis and architecture mapping |
| `feature-dev:code-architect` | Designs feature architectures with implementation blueprints |
| `pr-review-toolkit:code-reviewer` | Reviews against project guidelines |
| `pr-review-toolkit:silent-failure-hunter` | Finds inadequate error handling |
| `pr-review-toolkit:code-simplifier` | Simplifies code while preserving functionality |
| `pr-review-toolkit:pr-test-analyzer` | Reviews test coverage quality |
| `Explore` | Fast codebase exploration (files, patterns, architecture) |
| `Plan` | Software architect for implementation planning |
