# BandBrain MVP Specification

> **Version:** 5.0 | **Last Updated:** January 2026

## Quick Links

| Document | Description | When to Read |
|----------|-------------|--------------|
| [PROGRESS.md](./PROGRESS.md) | Development phases & checklist | **Start here** - Track what's done |
| [SCHEMA.md](./SCHEMA.md) | Database schema (Convex) | When working on data layer |
| [AUTH.md](./AUTH.md) | Google OAuth setup | When implementing auth |
| [FILES.md](./FILES.md) | File uploads, storage, waveforms | When working on file features |
| [GEAR.md](./GEAR.md) | Gear settings & visual knobs | When building gear UI |
| [TRAINING.md](./TRAINING.md) | Metronome, drone, chord player | When building training tools |
| [RECORDING.md](./RECORDING.md) | Recording projects & bounces | When building recording features |
| [SETLISTS.md](./SETLISTS.md) | Setlists & gear deltas | When building setlist features |
| [UI.md](./UI.md) | Components, error handling, structure | When building UI components |

---

## Executive Summary

BandBrain is a collaborative web application designed to help gigging musicians efficiently manage their practice routines across multiple bands, coordinate recording sessions, and improve their musicianship through integrated training tools.

**Key collaborative features:**
- Band members have their own accounts and share equal access to band content
- Invite members via shareable codes
- All members can add/edit songs, upload files, create setlists, and comment on bounces

**Platform:** Optimized equally for mobile and desktop use.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14+ (App Router) | Server components, API routes, TypeScript |
| **Backend/Database** | Convex | Reactive database, realtime subscriptions, built-in file storage |
| **Auth** | Convex Auth (Google OAuth) | Single-click sign-in, no password management |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible components |
| **Deployment** | Vercel | Seamless Next.js integration |
| **File Storage** | Convex Storage | Built-in, 100MB max, 2GB per user |
| **Audio Analysis** | Essentia.js | Browser-based tempo/key detection |
| **Tab Rendering** | AlphaTab | Guitar Pro format support, MIDI playback |
| **Waveform** | wavesurfer.js | Interactive waveforms |
| **Audio Synth** | Tone.js | Chord progression player |
| **Error Tracking** | Sentry | Production error monitoring |

---

## Key Decisions (v5.0)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | Google Sign-In only | Simpler UX, no password management |
| Collaboration | Multi-user bands | All members have equal permissions |
| Band invites | Shareable codes | Easy to share, no email required |
| Gear settings | Visual knob dials | Mimics real hardware (0-1 position) |
| Practice status | 4 levels | new → learning → solid → performance_ready |
| Storage | 2GB per user | Reasonable for audio files |
| Learning projects | Removed | Use "Personal Practice" band instead |
| Daily lick | Removed | Cut for MVP scope |
| Testing | Manual only | Automated tests post-launch |

---

## Environment Variables

```bash
# .env.local

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Convex Auth (generate with: openssl rand -base64 32)
CONVEX_AUTH_SECRET=your-secret-here

# Google OAuth (from Google Cloud Console > APIs & Services > Credentials)
AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_CLIENT_SECRET=your-client-secret

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx

# Site URL (for auth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Changelog from v4.0

### Added
- `bandMemberships` table for collaborative multi-user bands
- `inviteCode` field on bands for shareable join links
- `storageUsedBytes` field on users for quota tracking
- 2GB per-user storage quota enforcement
- Chord progression player with preset drum beats
- Visual knob dial UI system (position-based)
- User-defined gear pieces with custom knob labels

### Changed
- Auth switched from email/password to Google Sign-In only
- Gear settings simplified to visual knob positions
- Practice status changed to 4 levels
- Development phases reorganized by dependencies

### Removed
- `learningProjects` tables (use "Personal Practice" band)
- `licks` tables (Daily Lick feature cut)
- Transposition helper (post-MVP)
- Password authentication
- Automated testing requirement for MVP
