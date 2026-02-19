# Future Considerations

> **Purpose:** This document captures features and functionality deferred from the MVP to be considered for future phases.
>
> **Last Updated:** January 22, 2026

---

## Overview

To ship a functional MVP quickly, the following features have been deferred. The MVP focuses on single-user song management with essential tools (audio playback, gear settings, metronome, drone, recording projects, setlists).

---

## Deferred Features

### 1. Multi-User Band Collaboration

**Original Vision:**
- Multiple users could join a band via shareable invite codes
- All band members had equal permissions to edit songs, files, and settings
- Separate personal practice status per user (`userSongProgress` table)

**What Was Built:**
- `bandMemberships` table with join/leave functionality
- 6-character invite codes
- Member list view with instruments per member
- Personal progress tracking separate from shared song data

**Why Deferred:**
- Complex permission model for shared data
- Conflict resolution for concurrent edits not designed
- Product requirements for "whose changes win" unclear
- Single-user mode provides immediate value without collaboration complexity

**Future Implementation Notes:**
- Consider real-time collaboration like Google Docs (OT/CRDT)
- Define clear ownership model (band owner vs. member permissions)
- Add activity feeds to see who changed what
- Consider per-instrument ownership (guitarist edits guitar parts)

---

### 2. Tab Rendering (AlphaTab)

**Original Vision:**
- Render Guitar Pro files (.gp, .gpx, .gp5) in-browser
- MIDI playback synchronized with tab display
- Interactive cursor following playback

**What Was Planned:**
- Lazy-loaded AlphaTab library (~2MB)
- SoundFont files for MIDI playback
- Tab viewer component with play/pause/seek controls

**Why Deferred:**
- Large library size impacts initial bundle
- No test files available during development
- Audio playback with waveform covers 80% of use cases
- Tab files can still be uploaded and stored as attachments

**Future Implementation Notes:**
- Consider server-side rendering for tab preview thumbnails
- Explore lighter alternatives if full AlphaTab is too heavy
- Add transposition support for tabs
- Consider tab-to-audio sync for practice along

---

### 3. Chord Progression Player

**Original Vision:**
- Enter chord progressions (Am - G - F - E)
- Set bars per chord
- Synthesized chord playback as backing track

**What Was Planned:**
- `Tone.PolySynth` for chord voicings
- Loop playback with visual chord highlighting
- BPM control synced to song tempo

**Why Deferred:**
- Training tools prioritized as metronome/drone first
- Chord voicing complexity (inversions, voicings)
- Can be added incrementally after core training tools

**Future Implementation Notes:**
- Add common chord progression presets (I-IV-V-I, etc.)
- Support Nashville number system input
- Add strum patterns for more realistic playback
- Consider guitar-specific chord voicing library

---

### 4. Drum Beats / Backing Tracks

**Original Vision:**
- Preset drum patterns (rock, pop, jazz, shuffle, ballad)
- Drum beats play under chord progressions
- User-uploadable drum samples

**What Was Planned:**
- `Tone.Sampler` with kick, snare, hi-hat samples
- Pattern sequencer for different styles
- BPM-synced playback

**Why Deferred:**
- Depends on chord progression player
- Sample file hosting adds complexity
- Core practice tools (metronome, drone) sufficient for MVP

**Future Implementation Notes:**
- Start with built-in samples before custom upload
- Consider using Web Audio API drum synthesis instead of samples
- Add swing/groove percentage control
- Consider MIDI drum pattern import

---

### 5. Licks Database

**Original Vision:**
- Curated lick library by genre/technique
- User-contributed licks
- AI-generated licks (via Vercel AI Gateway)
- "Daily Lick" feature for practice inspiration

**What Was Planned:**
- `licks` table with notation, audio, difficulty
- `dailyLickHistory` for tracking shown licks
- `aiGenerationLimits` for rate limiting AI generation

**Why Deferred:**
- Requires significant content curation
- AI integration adds complexity and cost
- Core practice tracking more important for MVP

**Future Implementation Notes:**
- Start with curated basics before AI generation
- Add lick transposition to current song key
- Consider tab/notation rendering for licks
- Add progress tracking (learned licks)

---

### 6. Learning Projects (Personal Repertoire)

**Original Vision:**
- Personal learning separate from band songs
- Exercises, covers, personal practice material
- Not tied to any band

**What Was Planned:**
- `learningProjects`, `learningProjectFiles` tables
- Similar to songs but without band association

**Why Deferred:**
- MVP simplifies to single-user bands
- Bands can function as personal "projects"
- Reduces UI complexity

**Future Implementation Notes:**
- May not be needed if bands serve as personal organization
- Consider "private" vs "band" song distinction instead

---

## Schema Tables Not Needed for MVP

The following tables from the original schema are not needed for the simplified MVP:

| Table | Reason |
|-------|--------|
| `bandMemberships` | Single-user model, no sharing |
| `userSongProgress` | Practice status lives on song directly |
| `learningProjects` | Bands serve as personal organization |
| `learningProjectFiles` | See above |
| `licks` | Lick database deferred |
| `dailyLickHistory` | See above |
| `aiGenerationLimits` | See above |

---

## Migration Path

When adding multi-user collaboration in the future:

1. **Add `bandMemberships` table back** with clear permission model
2. **Migrate existing bands** to have creator as sole member
3. **Add invite flow** with optional acceptance
4. **Implement `userSongProgress`** for personal tracking
5. **Design conflict resolution** for concurrent edits

---

## Priority Order for Future Phases

**Post-MVP Phase 1 (Next after launch):**
1. Chord progression player
2. Drum beats / backing tracks

**Post-MVP Phase 2:**
1. Multi-user collaboration
2. Tab rendering
3. Licks database

---

## Questions for Future Design

1. **Collaboration model:** Real-time sync vs. last-write-wins vs. approval workflow?
2. **Permissions:** Band owner only vs. equal members vs. role-based?
3. **Tab rendering:** Full AlphaTab vs. static image vs. simplified viewer?
4. **AI licks:** How to make them musically useful? What training data?
5. **Mobile:** Native app or PWA? Offline support needed?
