# Peaks ⛰️

A mountain-climbing card game for the web. One **Daily Summit** board per UTC day — the same seeded
board for every player in the world. Chain clears to build combos, summit the peak, share your climb.

**Status: Phase 1 in progress.** Source of truth: [`docs/PEAKS_PHASE1.md`](docs/PEAKS_PHASE1.md).

## Run it

```
npm install
npm run dev
```

| Command              | What it does                             |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Dev server with HMR                      |
| `npm test`           | Run the Vitest suite once                |
| `npm run test:watch` | Vitest in watch mode                     |
| `npm run build`      | Type-check + production build to `dist/` |
| `npm run preview`    | Serve the production build locally       |
| `npm run lint`       | ESLint                                   |
| `npm run format`     | Prettier (write)                         |
| `npm run icons`      | Regenerate branded PWA icons             |

No environment variables are required — copy `.env.example` to `.env` only if you need to override
defaults (PostHog key, site URL, launch date).

> **Note:** `VITE_LAUNCH_DATE` (day #1 of the Daily Summit) is provisional — `2026-08-19` UTC.
> The day index will be re-anchored to the real launch date before public launch.

## Architecture

- **TypeScript + Vite, vanilla DOM + CSS.** No framework.
- **`src/engine/`** — pure, deterministic game rules. Zero DOM imports (lint-enforced). Any game is
  fully replayable from `(seed, moveList)`, which is the contract for Phase 2 server-side score
  validation.
- **`src/daily/`** — daily seed (UTC date → `mulberry32`), streak, share card. _(Step 3+)_
- **`src/store/`** — persistence behind a `Store` interface; localStorage now, Supabase later. _(Step 3)_
- **`src/ui/`** — board, SVG cards, HUD, modals. _(Step 4+)_
- **PWA** via `vite-plugin-pwa`; offline-playable. _(polish in Step 6)_

### How the daily seed works

The UTC date `YYYYMMDD` as an integer feeds `mulberry32` (`src/daily/seed.ts` →
`src/engine/deal.ts`). Same seed → identical shuffle, ice placement, and board on every device,
with no server involved. Difficulty (ice count, 0–3) rotates by UTC weekday via the
`TIER_BY_WEEKDAY` constant; the Daily Summit allows 3 undos. A stored result for today's UTC date
key is the once-per-day lock, and `seed` + the stored move list is the future server-side
validation payload.

## QA tooling

With a dev server running (`npm run dev`):

- `node scripts/qa.mjs http://localhost:<port>` — scripted end-to-end checklist (fresh install →
  daily → mid-game refresh resume → soft-stuck → undo → finish → share → revisit → practice →
  fake-clock next-day rollover) in a headless local Chrome/Edge; exits non-zero on failure.
- `node scripts/screenshots.mjs http://localhost:<port>` — regenerates the status-report
  screenshots deterministically.
- `node scripts/gif.mjs http://localhost:<port>` — records a short gameplay GIF (needs ffmpeg).

## Deploy

Zero-config Vite project — connect the repo to Vercel and every push gets a preview deploy.
