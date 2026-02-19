# BandBrain MVP - Development Progress

> **How to use:** Check off items as they're completed. Update the "Last Updated" date when making changes.
>
> **Last Updated:** January 22, 2026

---

## Scope Simplification (January 22, 2026)

The MVP scope has been simplified to ship faster:

1. **Single-user model** - Bands are personal song collections, no multi-user sharing
2. **No tab rendering** - AlphaTab deferred, audio playback covers primary use case
3. **Training tools** - Metronome and drone only, chord progressions/licks deferred

See [FUTURE_CONSIDERATIONS.md](./FUTURE_CONSIDERATIONS.md) for deferred features.

---

## Overall Progress

| Phase | Status | Items Done | Total |
|-------|--------|------------|-------|
| 1. Foundation & Auth | ✅ Complete | 6 | 6 |
| 2. Bands (Single-User) | 🟡 Needs Update | 2 | 2 |
| 3. Songs & Files | ✅ Complete | 6 | 6 |
| 4. Audio Features | ✅ Complete | 3 | 3 |
| 5. Tab Rendering | ❌ Deferred | - | - |
| 6. Gear Settings | ✅ Complete | 5 | 5 |
| 7. Training Tools | ⚪ Not Started | 0 | 2 |
| 8. Recording Projects | ⚪ Not Started | 0 | 5 |
| 9. Setlists | ⚪ Not Started | 0 | 4 |
| 10. Practice & Export | ⚪ Not Started | 0 | 3 |
| 11. Polish | ⚪ Not Started | 0 | 4 |

**Legend:** ✅ Complete | 🟡 In Progress | ❌ Deferred | ⚪ Not Started

---

## Phase 1: Foundation & Auth
**Dependencies:** None (starting point)
**Spec:** [AUTH.md](./AUTH.md)

- [x] Project setup (Next.js, Convex, Tailwind, shadcn/ui)
- [x] Google OAuth authentication via Convex Auth
- [x] User model with storage tracking
- [x] Basic error boundary
- [x] PostHog integration
- [x] Responsive layout shell (mobile + desktop)

**Notes:**
- Next.js 16 with React 19 and Tailwind CSS 4 (CSS-first config)
- Convex schema fully defined, requires `npx convex dev` to deploy and generate types
- shadcn/ui components installed: button, card, dialog, form, input, label, sonner, avatar, badge, separator, sheet, dropdown-menu, select, textarea, tabs, table, progress, slider, checkbox
- PostHog provider with manual pageview tracking
- Mobile-responsive navigation with Sheet sidebar on mobile

---

## Phase 2: Bands (Single-User)
**Dependencies:** Phase 1 (need auth and users)
**Spec:** [SCHEMA.md](./SCHEMA.md)

- [x] Band CRUD with soft deletes
- [ ] **Remove multi-user code** - Simplify to owner-only model

**SCOPE CHANGE:** Bands are now personal song collections owned by a single user. No invite codes, no members, no collaboration. The `bandMemberships` table and related functionality will be removed.

**Existing code to update:**
- Remove `convex/bandMemberships.ts`
- Remove invite code generation/join from `convex/bands.ts`
- Remove member UI components (JoinBandDialog, InviteCodeDisplay, MemberCard, MemberList, LeaveBandDialog)
- Simplify band queries to just filter by `createdBy` user

**Notes:**
- Band membership model removed for MVP simplicity
- Bands now function as personal "folders" for organizing songs
- Single user = single band owner, no sharing

---

## Phase 3: Songs & Files
**Dependencies:** Phase 2 (songs belong to bands)
**Spec:** [SCHEMA.md](./SCHEMA.md), [FILES.md](./FILES.md)

- [x] Song CRUD with 4-level practice status (new → learning → solid → performance_ready)
- [x] File upload with size validation (100MB max)
- [x] Per-user storage quota tracking (2GB limit)
- [x] Upload rate limiting (50/hour)
- [x] External URL support (Dropbox, YouTube, Bandcamp, Google Drive)
- [x] Song sections structure

**Notes:**
- Created `convex/songs.ts` with queries (listByBand, get) and mutations (create, update, updatePracticeStatus, softDelete)
- Created `convex/files.ts` with queries (listBySong, getStorageUsage) and mutations (generateUploadUrl, saveSongFile, saveExternalUrl, setPrimary, softDelete, updateMetadata)
- Created `convex/songSections.ts` with queries (listBySong, listByInstrument, get) and mutations (create, update, reorder, softDelete)
- Rate limiting uses sliding window approach (50 uploads/hour per user)
- Storage quota tracking updates on file upload and reclaims space on delete
- External URL auto-detection for YouTube, YouTube Music, Dropbox, Bandcamp, Google Drive
- YouTube metadata auto-fetch via oEmbed API (title extraction, artist parsing)
- File types: audio, video, chart, tab, gp, stem, other
- useFileUpload hook with XHR progress tracking

---

## Phase 4: Audio Features
**Dependencies:** Phase 3 (need uploaded files)
**Spec:** [FILES.md](./FILES.md)

- [x] Waveform pre-computation on audio upload
- [x] wavesurfer.js integration for audio playback
- [x] Song duration detection

**Notes:**
- Installed `wavesurfer.js` (v7+) for waveform visualization and playback
- Created `convex/waveform.ts` with mutations for saving audio analysis results
- Created `src/lib/audio/analysis.ts` with Web Audio API-based waveform peak computation
- `WaveformPlayer` component with play/pause, volume, seek controls
- Audio files clickable to expand inline waveform player
- Duration auto-populates song's `durationSeconds` field
- **Essentia.js tempo/key detection** - Removed from MVP scope (heavy WASM binary)
- Archive/restore flow with proper storage reclaim on permanent delete

---

## Phase 5: Tab Rendering
**Status:** ❌ **DEFERRED**

See [FUTURE_CONSIDERATIONS.md](./FUTURE_CONSIDERATIONS.md) for future plans.

**Rationale:** Audio playback with waveform visualization covers the primary use case. Tab files can still be uploaded as attachments but won't render inline.

---

## Phase 6: Gear Settings
**Dependencies:** Phase 3 (gear settings attach to song sections)
**Spec:** [GEAR.md](./GEAR.md)

- [x] User-defined gear pieces (pedals, synths, amps)
- [x] Visual knob dial UI (position-based, 7-5 o'clock style)
- [x] Editable knob labels
- [x] Synth patch storage with override tracking
- [x] Per-section gear configurations

**Notes:**
- Created `src/components/gear/` with KnobDial, GearPieceEditor, AddGearDialog, SectionGearManager
- KnobDial uses vertical drag interaction (DAW-style), double-click to reset to center
- Visual rotation: 7 o'clock (0) to 5 o'clock (1) - 270 degree range matching real hardware
- Gear templates pre-populate common gear (Tube Screamer, Big Muff, Fender Twin, etc.)
- Gear types: pedal, synth, amp, other - each with custom icon
- Synths have additional patch number and patch name fields
- Gear settings organized by instrument tabs (Guitar, Bass, Synth/Keys, Drums, Vocals, Other)

---

## Phase 7: Training Tools
**Dependencies:** Phase 3 (metronome links to songs)
**Spec:** [TRAINING.md](./TRAINING.md)

- [ ] Metronome with song linking (auto-configure from song tempo/time)
- [ ] Drone player (auto-configure from song key)

**SCOPE CHANGE:** Simplified to metronome and drone only. Chord progressions, drum beats, and licks deferred.

**Notes:**
- Use Tone.js for audio synthesis
- Metronome: BPM, time signature, visual beat indicators
- Drone: Note selection, octave, sustained tone

---

## Phase 8: Recording Projects
**Dependencies:** Phase 3 (recording projects reference songs)
**Spec:** [RECORDING.md](./RECORDING.md)

- [ ] Recording project CRUD
- [ ] Recording songs within projects
- [ ] Tracking grid (instrument × song status matrix)
- [ ] Bounce uploads with waveform
- [ ] Timestamped comments on bounces

**Notes:**
<!-- Add implementation notes here -->

---

## Phase 9: Setlists
**Dependencies:** Phase 6 (need gear settings for deltas)
**Spec:** [SETLISTS.md](./SETLISTS.md)

- [ ] Setlist CRUD with duration calculation
- [ ] Starting gear settings (pre-show state)
- [ ] Computed gear deltas between songs
- [ ] Transition notes between songs

**Notes:**
<!-- Add implementation notes here -->

---

## Phase 10: Practice & Export
**Dependencies:** Phase 3 (practice logs reference songs)
**Spec:** [SCHEMA.md](./SCHEMA.md)

- [ ] Practice session logging (date, duration, songs, notes)
- [ ] Data export (full JSON dump)
- [ ] Storage usage display (already in user dropdown)

**Notes:**
<!-- Add implementation notes here -->

---

## Phase 11: Polish
**Dependencies:** All features complete

- [ ] Performance optimization
- [ ] Mobile responsiveness refinement
- [ ] Manual testing of all flows
- [ ] Bug fixes

---

## Manual Testing Checklist

> Complete this checklist before considering MVP ready for launch.

### Authentication
- [ ] Sign in with Google (new user creates account)
- [ ] Sign in with Google (existing user)
- [ ] Sign out
- [ ] Redirect to sign-in when accessing protected routes

### Bands (Single-User)
- [ ] Create a new band
- [ ] Edit band name
- [ ] Delete a band (soft delete)
- [ ] View empty band → create first song

### Songs & Files
- [ ] Create song with title only (minimal)
- [ ] Create song with all fields (key, mode, tempo, time signature, notes)
- [ ] Update practice status (new → learning → solid → performance_ready)
- [ ] Upload audio file via "Add File" button
- [ ] Upload file via drag-and-drop (verify overlay appears on drag)
- [ ] Verify upload progress bar displays
- [ ] Add YouTube link (verify metadata auto-populates display name)
- [ ] Add Dropbox/Google Drive link
- [ ] Edit file display name and variant label
- [ ] Download uploaded file (verify download button works)
- [ ] Archive file (verify confirmation dialog)
- [ ] Verify storage quota displays in user dropdown menu
- [ ] Filter songs by practice status tabs (All, New, Learning, Solid, Ready)

### Audio Features
- [ ] Upload audio file triggers waveform computation
- [ ] Waveform displays on song detail page (click audio file row to expand)
- [ ] Audio playback works (play/pause)
- [ ] Volume control works
- [ ] Duration auto-populates song when uploading audio
- [ ] Permanently delete archived file reclaims storage

### Gear Settings
- [ ] Add gear piece (pedal/synth/amp)
- [ ] Add custom knobs to gear piece
- [ ] Adjust knob positions (visual dial)
- [ ] Edit knob labels
- [ ] Create song sections with different gear

### Training Tools
- [ ] Metronome: Set BPM, time signature, play/stop
- [ ] Metronome: Link to song (auto-configure)
- [ ] Drone player: Set key, play/stop

### Recording Projects
- [ ] Create recording project
- [ ] Add songs to project
- [ ] Update tracking grid status
- [ ] Upload bounce
- [ ] Add timestamped comment on bounce

### Setlists
- [ ] Create setlist
- [ ] Add songs to setlist
- [ ] Reorder songs
- [ ] View computed gear deltas
- [ ] Verify duration calculation

### Practice & Export
- [ ] Log practice session
- [ ] Export all data as JSON

### Mobile Responsiveness
- [ ] Test all above flows on mobile viewport
- [ ] Verify touch interactions work (knob dials, drag-drop)

---

## Blockers & Issues

> Document any blockers or issues encountered during development.

| Date | Issue | Status | Resolution |
|------|-------|--------|------------|
| 2026-01-22 | Multi-user complexity blocking MVP | Resolved | Simplified to single-user model |

---

## Session Notes

> Add notes at the end of each development session to help resume context.

### Session: January 22, 2026 (Scope Simplification)
**What was done:**
- Simplified MVP scope to ship faster
- Created FUTURE_CONSIDERATIONS.md to capture deferred features
- Updated PROGRESS.md with new simplified phases
- Marked Phase 5 (Tab Rendering) as deferred
- Simplified Phase 7 (Training) to metronome and drone only
- Removed multi-user band collaboration from MVP scope

**Next steps:**
- Remove `bandMemberships` table and related code
- Simplify bands.ts to owner-only queries
- Remove member UI components
- Update SCHEMA.md documentation
- Implement remaining phases

**Context to remember:**
- Bands are now personal song collections, not shared
- No invite codes, no join flow, no member management
- Practice status lives on song directly
- Recording Projects, Setlists, Practice Logging all still in scope

### Previous Sessions
*(See git history for older session notes)*
