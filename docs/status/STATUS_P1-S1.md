# STATUS — Phase 1, Step 1: Scaffold

**Date:** 2026-08-18 · **Status: complete, verified locally**

## What was built

- Vite 8 + TypeScript 6 (strict) project, vanilla DOM + CSS, no framework.
- Vitest 4 wired into `vite.config.ts`; one passing smoke test (`tests/smoke.test.ts`).
- ESLint 10 (flat config) + Prettier, with a purity rule for `src/engine/`: DOM/storage/timer
  globals are lint **errors** inside the engine.
- `vite-plugin-pwa` wired: manifest (name, colors, icons), auto-update service worker generated on
  build. Placeholder icons are code-generated (`npm run icons`, zero-dependency PNG writer in
  `scripts/gen-icons.mjs`) — a simple snow-capped peak on sky blue, including a maskable variant.
- Full §4 folder structure with typed stub modules (`engine/`, `daily/`, `ui/`, `store/`,
  `analytics.ts`) so imports resolve from day one.
- `.env.example` (PostHog key, site URL, launch date — all optional, app runs with none set).
- README with run/verify commands and architecture map. `.gitignore` excludes env files.
- Brief moved to `docs/PEAKS_PHASE1.md` (root copy deleted — one source of truth).
- All dependencies pinned to **exact versions**; `package-lock.json` committed.

## How to test

```
npm install
npm test          # 1 passing
npm run lint      # clean
npm run build     # type-check + build + PWA sw.js
npm run dev       # placeholder at the printed URL
```

Verified from this working copy: all four green. Placeholder ("Peaks ⛰️ — The Daily Summit is
under construction") renders with the mountain/sky palette, dark-mode aware.

## Screenshots

Placeholder screen only this step — real UI screenshots start at Step 4.

## Vercel connect (founder click-through, ~2 minutes)

1. Push the repo to GitHub (GitHub Desktop → Publish repository).
2. vercel.com → sign up/log in **with GitHub** (free Hobby tier).
3. "Add New… → Project" → Import `peaks-daily-solitaire`.
4. Project name: `peaks`. Framework preset: **Vite** (auto-detected). Leave build settings default
   (`npm run build`, output `dist`). No environment variables needed.
5. Deploy. Every future push to `main` deploys production; every branch/PR gets a preview URL.

## Known issues

- Placeholder icons are deliberately crude; real icons in Step 6.
- Dev server port: any free port works (`npm run dev` picks one if 5173 is busy).

## Decisions made

- Icon generation is scripted and dependency-free rather than committed binaries from a design
  tool — regenerate any time with `npm run icons`.
- `VITE_LAUNCH_DATE` placeholder set to `2026-09-01` — **needs the real launch date before Step 3.**

## Open questions

1. `docs/game_plan.md` is referenced by the brief but isn't in the repo — please add it when convenient.
2. Confirm the real launch date for the day-index constant (Step 3).

## Proposed plan for next step

Step 2 (engine) was pre-approved with the PM's decisions of 2026-08-18 and is being built next; see
`STATUS_P1-S2.md`.
