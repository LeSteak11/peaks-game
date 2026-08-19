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
| `npm run icons`      | Regenerate placeholder PWA icons         |

No environment variables are required — copy `.env.example` to `.env` only if you need to override
defaults (PostHog key, site URL, launch date).

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

_(Lands in Step 3.)_ The UTC date `YYYYMMDD` as an integer feeds `mulberry32`. Same seed → identical
shuffle, ice placement, and board on every device, with no server involved.

## Deploy

Zero-config Vite project — connect the repo to Vercel and every push gets a preview deploy.
