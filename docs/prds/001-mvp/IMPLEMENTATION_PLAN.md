# BandBrain MVP Implementation Plan

This document provides a phased implementation plan broken into granular, actionable tasks for iterative development.

---

## Overview

The implementation is divided into 6 phases, each building on the previous. Tasks within each phase are designed to be completable independently where possible, allowing for focused iteration.

**Estimated Total Tasks:** ~120 discrete tasks

---

## Phase 1: Foundation

**Goal:** Establish project infrastructure, authentication, and basic data models.

### 1.1 Project Setup

- [ ] **1.1.1** Initialize Next.js 14+ project with App Router and TypeScript
- [ ] **1.1.2** Configure Tailwind CSS
- [ ] **1.1.3** Install and configure shadcn/ui
- [ ] **1.1.4** Set up Convex backend (`npx convex dev`)
- [ ] **1.1.5** Create `.env.local` with required environment variables
- [ ] **1.1.6** Configure ESLint and Prettier
- [ ] **1.1.7** Set up TypeScript strict mode
- [ ] **1.1.8** Create base folder structure (`app/`, `components/`, `convex/`, `lib/`, `hooks/`)
- [ ] **1.1.9** Install Vitest for testing
- [ ] **1.1.10** Install Playwright for E2E testing
- [ ] **1.1.11** Configure PostHog error tracking and analytics

### 1.2 Authentication

- [ ] **1.2.1** Install `@convex-dev/auth` package
- [ ] **1.2.2** Create `convex/auth.ts` with Password provider
- [ ] **1.2.3** Create `convex/auth.config.ts`
- [ ] **1.2.4** Generate CONVEX_AUTH_SECRET and add to environment
- [ ] **1.2.5** Create `app/(auth)/layout.tsx` - auth layout (centered, no sidebar)
- [ ] **1.2.6** Create `app/(auth)/sign-in/page.tsx` - sign in page
- [ ] **1.2.7** Create `components/auth/SignInForm.tsx` - sign in form component
- [ ] **1.2.8** Create `app/(auth)/sign-up/page.tsx` - sign up page
- [ ] **1.2.9** Create `components/auth/SignUpForm.tsx` - sign up form component
- [ ] **1.2.10** Create `app/(auth)/reset-password/page.tsx` - password reset page (placeholder)
- [ ] **1.2.11** Create `hooks/useAuth.ts` - auth hook wrapper
- [ ] **1.2.12** Test sign up flow end-to-end
- [ ] **1.2.13** Test sign in flow end-to-end
- [ ] **1.2.14** Add sign out functionality

### 1.3 Database Schema

- [ ] **1.3.1** Create `convex/schema.ts` with `users` table
- [ ] **1.3.2** Add `bands` table to schema
- [ ] **1.3.3** Add `songs` table to schema
- [ ] **1.3.4** Add `songFiles` table to schema
- [ ] **1.3.5** Add `instrumentParts` table to schema
- [ ] **1.3.6** Add `learningProjects` table to schema
- [ ] **1.3.7** Add `learningProjectFiles` table to schema
- [ ] **1.3.8** Add `recordingProjects` table to schema
- [ ] **1.3.9** Add `recordingSongs` table to schema
- [ ] **1.3.10** Add `trackingGrid` table to schema
- [ ] **1.3.11** Add `bounces` table to schema
- [ ] **1.3.12** Add `bounceComments` table to schema
- [ ] **1.3.13** Add `setlists` table to schema
- [ ] **1.3.14** Add `setlistItems` table to schema
- [ ] **1.3.15** Add `practiceSessions` table to schema
- [ ] **1.3.16** Add `licks` table to schema
- [ ] **1.3.17** Add `dailyLickHistory` table to schema
- [ ] **1.3.18** Add `uploadRateLimits` table to schema
- [ ] **1.3.19** Add `aiGenerationLimits` table to schema
- [ ] **1.3.20** Define `gearSettingsValidator` for versioned gear settings
- [ ] **1.3.21** Add all required indexes for query optimization
- [ ] **1.3.22** Run `npx convex dev` to sync schema

### 1.4 Users Module

- [ ] **1.4.1** Create `convex/users.ts` with `current` query
- [ ] **1.4.2** Add `getById` query to users module
- [ ] **1.4.3** Add `update` mutation (name, preferences)
- [ ] **1.4.4** Add `softDelete` mutation

### 1.5 Dashboard Layout

- [ ] **1.5.1** Create `app/(dashboard)/layout.tsx` - protected layout wrapper
- [ ] **1.5.2** Create sidebar navigation component
- [ ] **1.5.3** Create header component with user menu
- [ ] **1.5.4** Add auth protection redirect to layout
- [ ] **1.5.5** Create `app/(dashboard)/page.tsx` - dashboard home
- [ ] **1.5.6** Create loading skeleton components

### 1.6 Error Handling

- [ ] **1.6.1** Create `components/ErrorBoundary.tsx`
- [ ] **1.6.2** Integrate ErrorBoundary in dashboard layout
- [ ] **1.6.3** Create `hooks/useMutationWithRetry.ts`
- [ ] **1.6.4** Configure PostHog client in `lib/posthog.ts`
- [ ] **1.6.5** Test error capture and reporting

---

## Phase 2: Core Features

**Goal:** Implement band management, song management, file uploads, and learning projects.

### 2.1 Bands Module

- [ ] **2.1.1** Create `convex/bands.ts` with `list` query (by user, active only)
- [ ] **2.1.2** Add `getById` query to bands module
- [ ] **2.1.3** Add `create` mutation
- [ ] **2.1.4** Add `update` mutation
- [ ] **2.1.5** Add `softDelete` mutation
- [ ] **2.1.6** Add `restore` mutation
- [ ] **2.1.7** Create `app/(dashboard)/bands/page.tsx` - bands list page
- [ ] **2.1.8** Create `components/bands/BandCard.tsx`
- [ ] **2.1.9** Create `components/bands/BandForm.tsx` (create/edit form)
- [ ] **2.1.10** Create `app/(dashboard)/bands/new/page.tsx` - new band page
- [ ] **2.1.11** Create `app/(dashboard)/bands/[id]/page.tsx` - band detail page
- [ ] **2.1.12** Create `app/(dashboard)/bands/[id]/edit/page.tsx` - edit band page
- [ ] **2.1.13** Add band member management (add/remove members)
- [ ] **2.1.14** Add instrument selection for "my instruments"

### 2.2 Songs Module

- [ ] **2.2.1** Create `convex/songs.ts` with `listByBand` query
- [ ] **2.2.2** Add `getById` query to songs module
- [ ] **2.2.3** Add `create` mutation
- [ ] **2.2.4** Add `update` mutation
- [ ] **2.2.5** Add `softDelete` mutation
- [ ] **2.2.6** Add `restore` mutation
- [ ] **2.2.7** Add `updatePracticeStatus` mutation
- [ ] **2.2.8** Add `getPracticeSettings` query (for metronome/drone linking)
- [ ] **2.2.9** Create `app/(dashboard)/bands/[id]/songs/page.tsx` - songs list
- [ ] **2.2.10** Create `components/songs/SongCard.tsx`
- [ ] **2.2.11** Create `components/songs/SongForm.tsx` (create/edit form)
- [ ] **2.2.12** Add key/mode selector component
- [ ] **2.2.13** Add tempo input with validation
- [ ] **2.2.14** Add time signature selector
- [ ] **2.2.15** Create song detail page `app/(dashboard)/bands/[id]/songs/[songId]/page.tsx`
- [ ] **2.2.16** Add practice status badges (learning, needs_work, performance_ready)
- [ ] **2.2.17** Add filtering by practice status

### 2.3 File Storage

- [ ] **2.3.1** Create `convex/files.ts` with `generateUploadUrl` mutation
- [ ] **2.3.2** Implement rate limiting in `generateUploadUrl`
- [ ] **2.3.3** Add `saveSongFile` mutation with size validation
- [ ] **2.3.4** Add `getFileUrl` query
- [ ] **2.3.5** Add `softDeleteFile` mutation
- [ ] **2.3.6** Create `hooks/useFileUpload.ts` with progress tracking
- [ ] **2.3.7** Create `components/audio/FileUploader.tsx` - drag and drop uploader
- [ ] **2.3.8** Add file type detection and icon display
- [ ] **2.3.9** Add client-side file size validation
- [ ] **2.3.10** Display file list on song detail page
- [ ] **2.3.11** Add file download functionality
- [ ] **2.3.12** Add file version management
- [ ] **2.3.13** Set primary file toggle

### 2.4 Instrument Parts

- [ ] **2.4.1** Add `listBySong` query to songs module
- [ ] **2.4.2** Add `createInstrumentPart` mutation
- [ ] **2.4.3** Add `updateInstrumentPart` mutation
- [ ] **2.4.4** Add `deleteInstrumentPart` mutation
- [ ] **2.4.5** Create `components/songs/InstrumentPartEditor.tsx`
- [ ] **2.4.6** Add gear settings editor with versioned schema
- [ ] **2.4.7** Add pedal chain builder UI
- [ ] **2.4.8** Add amp settings editor
- [ ] **2.4.9** Add synth patch settings editor
- [ ] **2.4.10** Add difficulty rating selector

### 2.5 Learning Projects

- [ ] **2.5.1** Create `convex/learningProjects.ts` with `list` query
- [ ] **2.5.2** Add `getById` query
- [ ] **2.5.3** Add `create` mutation
- [ ] **2.5.4** Add `update` mutation
- [ ] **2.5.5** Add `softDelete` mutation
- [ ] **2.5.6** Add file upload support for learning projects
- [ ] **2.5.7** Create `app/(dashboard)/learning/page.tsx` - learning projects list
- [ ] **2.5.8** Create `components/learning/LearningProjectCard.tsx`
- [ ] **2.5.9** Create `components/learning/LearningProjectForm.tsx`
- [ ] **2.5.10** Create `app/(dashboard)/learning/new/page.tsx`
- [ ] **2.5.11** Create `app/(dashboard)/learning/[id]/page.tsx` - detail page
- [ ] **2.5.12** Add category filter (classical, cover, original, exercise)
- [ ] **2.5.13** Add source URL field and display

### 2.6 Practice Session Logging

- [ ] **2.6.1** Create `convex/practiceSessions.ts` with `list` query
- [ ] **2.6.2** Add `create` mutation
- [ ] **2.6.3** Add `update` mutation
- [ ] **2.6.4** Add `delete` mutation
- [ ] **2.6.5** Create `app/(dashboard)/practice-log/page.tsx`
- [ ] **2.6.6** Create `components/practice/PracticeSessionForm.tsx`
- [ ] **2.6.7** Add song selection for practice session
- [ ] **2.6.8** Add duration tracking
- [ ] **2.6.9** Create practice session calendar view
- [ ] **2.6.10** Add practice statistics summary

---

## Phase 3: Audio & Visualization

**Goal:** Implement audio waveform visualization and analysis.

### 3.1 Waveform Computation

- [ ] **3.1.1** Create `convex/waveform.ts` with `computeWaveform` action
- [ ] **3.1.2** Implement `savePeaks` internal mutation
- [ ] **3.1.3** Add proper audio decoding for peak computation
- [ ] **3.1.4** Trigger waveform computation on file upload
- [ ] **3.1.5** Add loading state while waveform is being computed

### 3.2 Waveform Player

- [ ] **3.2.1** Install wavesurfer.js
- [ ] **3.2.2** Create `components/audio/WaveformPlayer.tsx`
- [ ] **3.2.3** Implement play/pause controls
- [ ] **3.2.4** Add seek functionality
- [ ] **3.2.5** Display pre-computed peaks from database
- [ ] **3.2.6** Add volume control
- [ ] **3.2.7** Add playback speed control
- [ ] **3.2.8** Style waveform to match app theme
- [ ] **3.2.9** Add keyboard shortcuts (space to play/pause)
- [ ] **3.2.10** Integrate waveform player on song detail page

### 3.3 Audio Analysis (Optional)

- [ ] **3.3.1** Install Essentia.js
- [ ] **3.3.2** Create `lib/audio/analyzer.ts`
- [ ] **3.3.3** Implement tempo detection
- [ ] **3.3.4** Implement key detection
- [ ] **3.3.5** Create `components/audio/AudioAnalyzer.tsx` UI
- [ ] **3.3.6** Store detected values on song file record
- [ ] **3.3.7** Add confidence score display
- [ ] **3.3.8** Allow user to accept/reject detected values

---

## Phase 4: Tab & Training Tools

**Goal:** Implement AlphaTab viewer and practice training tools.

### 4.1 AlphaTab Integration

- [ ] **4.1.1** Install @coderline/alphatab
- [ ] **4.1.2** Download and add Bravura fonts to `/public/fonts/bravura/`
- [ ] **4.1.3** Download and add SoundFont to `/public/soundfonts/`
- [ ] **4.1.4** Create `components/tab/AlphaTabViewer.tsx` with lazy loading
- [ ] **4.1.5** Implement alphaTex string rendering
- [ ] **4.1.6** Implement Guitar Pro file loading
- [ ] **4.1.7** Add play/pause controls
- [ ] **4.1.8** Add tempo adjustment slider
- [ ] **4.1.9** Add loop region selection
- [ ] **4.1.10** Handle loading and error states
- [ ] **4.1.11** Integrate on song detail page for tab files

### 4.2 Metronome

- [ ] **4.2.1** Create `components/training/Metronome.tsx`
- [ ] **4.2.2** Implement Web Audio API click sound generation
- [ ] **4.2.3** Add BPM input and adjustment
- [ ] **4.2.4** Add time signature selector
- [ ] **4.2.5** Add accent on first beat option
- [ ] **4.2.6** Add visual beat indicator
- [ ] **4.2.7** Add tap tempo functionality
- [ ] **4.2.8** Add preset tempos (common tempos)
- [ ] **4.2.9** Implement song linking (auto-configure from song)
- [ ] **4.2.10** Create `app/(dashboard)/training/metronome/page.tsx`

### 4.3 Drone Player

- [ ] **4.3.1** Create `components/training/DronePlayer.tsx`
- [ ] **4.3.2** Implement Web Audio API oscillator for drone
- [ ] **4.3.3** Add root note selector (all 12 notes)
- [ ] **4.3.4** Add octave selector
- [ ] **4.3.5** Add major/minor/modal options
- [ ] **4.3.6** Add fifth/third optional drones
- [ ] **4.3.7** Add volume control
- [ ] **4.3.8** Implement song linking (auto-configure from song key)
- [ ] **4.3.9** Create `app/(dashboard)/training/drone/page.tsx`

### 4.4 Chord Progression Player

- [ ] **4.4.1** Create `components/training/ChordProgPlayer.tsx`
- [ ] **4.4.2** Implement chord voicing generation
- [ ] **4.4.3** Add chord progression input
- [ ] **4.4.4** Add tempo control
- [ ] **4.4.5** Add chord duration control
- [ ] **4.4.6** Add loop option
- [ ] **4.4.7** Create `app/(dashboard)/training/chords/page.tsx`

### 4.5 Transposition Helper

- [ ] **4.5.1** Create `lib/music/transposition.ts`
- [ ] **4.5.2** Implement `transpose` function
- [ ] **4.5.3** Implement `transposeProgression` function
- [ ] **4.5.4** Handle flats and sharps
- [ ] **4.5.5** Create `components/training/TransposeHelper.tsx` UI
- [ ] **4.5.6** Add to song detail page

### 4.6 Daily Lick System

- [ ] **4.6.1** Create `convex/licks.ts` with `getDailyLick` query
- [ ] **4.6.2** Implement lick history tracking to avoid repeats
- [ ] **4.6.3** Add `saveLick` mutation for user licks
- [ ] **4.6.4** Add `listUserLicks` query
- [ ] **4.6.5** Create `components/training/DailyLick.tsx`
- [ ] **4.6.6** Integrate AlphaTab for lick display
- [ ] **4.6.7** Add metronome integration
- [ ] **4.6.8** Create `app/(dashboard)/training/licks/page.tsx`

### 4.7 AI Lick Generation

- [ ] **4.7.1** Implement `checkAiRateLimit` internal mutation
- [ ] **4.7.2** Implement `generateAiLick` action with Claude API
- [ ] **4.7.3** Implement `saveGeneratedLick` internal mutation
- [ ] **4.7.4** Add rate limit display in UI
- [ ] **4.7.5** Add style selector for AI generation
- [ ] **4.7.6** Add difficulty selector for AI generation
- [ ] **4.7.7** Add key selector for AI generation
- [ ] **4.7.8** Display generated lick with AlphaTab

### 4.8 Training Dashboard

- [ ] **4.8.1** Create `app/(dashboard)/training/page.tsx` - training hub
- [ ] **4.8.2** Add quick links to all training tools
- [ ] **4.8.3** Show daily lick widget on training page
- [ ] **4.8.4** Add recent songs for quick practice configuration

---

## Phase 5: Recording & Setlists

**Goal:** Implement recording project management and setlist builder.

### 5.1 Recording Projects

- [ ] **5.1.1** Create `convex/recordingProjects.ts` with `list` query
- [ ] **5.1.2** Add `getById` query
- [ ] **5.1.3** Add `create` mutation
- [ ] **5.1.4** Add `update` mutation
- [ ] **5.1.5** Add `softDelete` mutation
- [ ] **5.1.6** Add `updateStatus` mutation
- [ ] **5.1.7** Create `app/(dashboard)/recording/page.tsx` - projects list
- [ ] **5.1.8** Create `components/recording/RecordingProjectCard.tsx`
- [ ] **5.1.9** Create `components/recording/RecordingProjectForm.tsx`
- [ ] **5.1.10** Create `app/(dashboard)/recording/new/page.tsx`
- [ ] **5.1.11** Create `app/(dashboard)/recording/[id]/page.tsx` - project detail
- [ ] **5.1.12** Add status workflow (pre_production -> tracking -> mixing -> mastering -> complete)

### 5.2 Recording Songs

- [ ] **5.2.1** Add `listSongsByProject` query to recordingProjects module
- [ ] **5.2.2** Add `addSongToProject` mutation
- [ ] **5.2.3** Add `removeSongFromProject` mutation
- [ ] **5.2.4** Add `reorderSongs` mutation
- [ ] **5.2.5** Allow linking to existing band songs
- [ ] **5.2.6** Create song list UI on project detail page

### 5.3 Tracking Grid

- [ ] **5.3.1** Add `getTrackingGrid` query
- [ ] **5.3.2** Add `updateTrackStatus` mutation
- [ ] **5.3.3** Create `components/recording/TrackingGrid.tsx`
- [ ] **5.3.4** Add status colors (not_started, in_progress, needs_redo, complete)
- [ ] **5.3.5** Add performer assignment
- [ ] **5.3.6** Add notes per track cell
- [ ] **5.3.7** Add completion percentage display

### 5.4 Bounces

- [ ] **5.4.1** Create `convex/bounces.ts` with `listBySong` query
- [ ] **5.4.2** Add `upload` mutation (with file save)
- [ ] **5.4.3** Add `softDelete` mutation
- [ ] **5.4.4** Trigger waveform computation on bounce upload
- [ ] **5.4.5** Create `components/recording/BouncePlayer.tsx`
- [ ] **5.4.6** Add version label display
- [ ] **5.4.7** Add bounce comparison (A/B toggle)
- [ ] **5.4.8** Create bounce upload UI

### 5.5 Bounce Comments

- [ ] **5.5.1** Add `listCommentsByBounce` query
- [ ] **5.5.2** Add `addComment` mutation
- [ ] **5.5.3** Add `deleteComment` mutation
- [ ] **5.5.4** Create `components/recording/BounceComments.tsx`
- [ ] **5.5.5** Add timestamp input for timed comments
- [ ] **5.5.6** Click timestamp to seek waveform
- [ ] **5.5.7** Add marker display on waveform for comments

### 5.6 Setlists

- [ ] **5.6.1** Create `convex/setlists.ts` with `listByBand` query
- [ ] **5.6.2** Add `getById` query
- [ ] **5.6.3** Add `create` mutation
- [ ] **5.6.4** Add `update` mutation
- [ ] **5.6.5** Add `softDelete` mutation
- [ ] **5.6.6** Implement `recalculateSetlistDuration` helper
- [ ] **5.6.7** Add `getSetlistWithDuration` query
- [ ] **5.6.8** Create `app/(dashboard)/setlists/page.tsx` - setlists list
- [ ] **5.6.9** Create `components/setlists/SetlistCard.tsx`
- [ ] **5.6.10** Create `app/(dashboard)/setlists/new/page.tsx`
- [ ] **5.6.11** Create `app/(dashboard)/setlists/[id]/page.tsx` - setlist detail

### 5.7 Setlist Items

- [ ] **5.7.1** Add `addSongToSetlist` mutation
- [ ] **5.7.2** Add `removeSongFromSetlist` mutation
- [ ] **5.7.3** Add `reorderSetlistItems` mutation
- [ ] **5.7.4** Add `updateSetlistItem` mutation (gear snapshot, notes)
- [ ] **5.7.5** Create drag-and-drop setlist builder UI
- [ ] **5.7.6** Display running duration as songs are added
- [ ] **5.7.7** Add gear snapshot capture
- [ ] **5.7.8** Add transition notes between songs
- [ ] **5.7.9** Create setlist print/export view

---

## Phase 6: Polish & Testing

**Goal:** Add data export, comprehensive tests, and polish.

### 6.1 Data Export

- [ ] **6.1.1** Create `convex/export.ts` with internal queries for each entity
- [ ] **6.1.2** Implement `exportUserData` action
- [ ] **6.1.3** Generate JSON export file
- [ ] **6.1.4** Store export temporarily and return URL
- [ ] **6.1.5** Schedule auto-deletion of export file after 1 hour
- [ ] **6.1.6** Create `app/(dashboard)/settings/page.tsx`
- [ ] **6.1.7** Create `app/(dashboard)/settings/export/page.tsx`
- [ ] **6.1.8** Add export button with loading state
- [ ] **6.1.9** Display download link on completion

### 6.2 Settings Page

- [ ] **6.2.1** Create settings navigation
- [ ] **6.2.2** Add profile settings (name, email display)
- [ ] **6.2.3** Add password change (if supported)
- [ ] **6.2.4** Add account deletion option
- [ ] **6.2.5** Display storage usage statistics

### 6.3 Convex Function Tests

- [ ] **6.3.1** Set up convex-test in `convex/tests/`
- [ ] **6.3.2** Write tests for users module
- [ ] **6.3.3** Write tests for bands module
- [ ] **6.3.4** Write tests for songs module
- [ ] **6.3.5** Write tests for files module (including rate limiting)
- [ ] **6.3.6** Write tests for learning projects module
- [ ] **6.3.7** Write tests for recording projects module
- [ ] **6.3.8** Write tests for setlists module (including duration calc)
- [ ] **6.3.9** Write tests for licks module (including AI rate limiting)
- [ ] **6.3.10** Write tests for soft delete behavior

### 6.4 Component Tests

- [ ] **6.4.1** Set up Testing Library in `__tests__/`
- [ ] **6.4.2** Create Convex client mock
- [ ] **6.4.3** Write tests for auth forms
- [ ] **6.4.4** Write tests for song card component
- [ ] **6.4.5** Write tests for band card component
- [ ] **6.4.6** Write tests for file uploader component
- [ ] **6.4.7** Write tests for waveform player component
- [ ] **6.4.8** Write tests for metronome component
- [ ] **6.4.9** Write tests for tracking grid component
- [ ] **6.4.10** Write tests for setlist builder

### 6.5 E2E Tests

- [ ] **6.5.1** Set up Playwright in `e2e/`
- [ ] **6.5.2** Write auth flow tests (sign up, sign in, sign out)
- [ ] **6.5.3** Write band CRUD tests
- [ ] **6.5.4** Write song CRUD tests
- [ ] **6.5.5** Write file upload tests
- [ ] **6.5.6** Write learning project tests
- [ ] **6.5.7** Write recording project tests
- [ ] **6.5.8** Write setlist builder tests
- [ ] **6.5.9** Write training tools tests
- [ ] **6.5.10** Write data export test

### 6.6 Performance Optimization

- [ ] **6.6.1** Audit bundle size
- [ ] **6.6.2** Verify AlphaTab is lazy loaded correctly
- [ ] **6.6.3** Add loading skeletons for all async operations
- [ ] **6.6.4** Implement list virtualization for long lists
- [ ] **6.6.5** Optimize image/file loading
- [ ] **6.6.6** Review and optimize Convex queries
- [ ] **6.6.7** Add database indexes for slow queries

### 6.7 Mobile Responsiveness

- [ ] **6.7.1** Audit all pages on mobile viewport
- [ ] **6.7.2** Fix sidebar/navigation for mobile
- [ ] **6.7.3** Fix forms for mobile
- [ ] **6.7.4** Fix waveform player for mobile
- [ ] **6.7.5** Fix tracking grid for mobile
- [ ] **6.7.6** Fix setlist builder for mobile
- [ ] **6.7.7** Test touch interactions

### 6.8 Final Polish

- [ ] **6.8.1** Add empty states for all list views
- [ ] **6.8.2** Add confirmation dialogs for destructive actions
- [ ] **6.8.3** Add toast notifications for actions
- [ ] **6.8.4** Review and improve error messages
- [ ] **6.8.5** Add keyboard navigation support
- [ ] **6.8.6** Review accessibility (a11y audit)
- [ ] **6.8.7** Add favicon and app icons
- [ ] **6.8.8** Create landing page (if needed)
- [ ] **6.8.9** Final PostHog configuration review
- [ ] **6.8.10** Deploy to Vercel production

---

## Task Dependencies

Some tasks have dependencies on others. Here's a quick reference:

| Task | Depends On |
|------|-----------|
| 1.2.* (Auth) | 1.1.* (Setup), 1.3.1 (users schema) |
| 1.5.* (Dashboard) | 1.2.* (Auth) |
| 2.1.* (Bands) | 1.3.2 (bands schema), 1.5.* (Dashboard) |
| 2.2.* (Songs) | 2.1.* (Bands) |
| 2.3.* (Files) | 2.2.* (Songs) |
| 3.* (Audio) | 2.3.* (Files) |
| 4.1.* (AlphaTab) | 2.3.* (Files) |
| 4.2-4.5 (Training) | 1.5.* (Dashboard) |
| 4.6-4.7 (Licks) | 4.1.* (AlphaTab) |
| 5.1-5.5 (Recording) | 2.2.* (Songs) |
| 5.6-5.7 (Setlists) | 2.2.* (Songs) |
| 6.* (Polish) | All previous phases |

---

## Progress Tracking

Progress is tracked in [PROGRESS.md](./PROGRESS.md).

---

*Document Version: 1.0*
*Created: January 2026*
