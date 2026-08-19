# PEAKS — Project Brief & Phase 1 Plan

**Repo:** `peaks-daily-solitaire`
**Team:** Founder (Kayleigh) · PM (external, communicates through the founder) · You (sole developer)
**This document is the source of truth for Phase 1. Read it fully before replying.**

---

## 1. Working rules (read twice)

1. **Plan → approval → build.** For every step below, first reply with a short written plan: files you'll create/touch, approach, test list, risks, and what "done" looks like. **Write no code until the founder replies `APPROVED`.** If the plan comes back with edits, revise and wait again.
2. **Scope is locked.** Build only what's in the approved plan for the current step. If you think something should change, stop and raise it in one concise message.
3. **When a step is done, deliver exactly two things, then stop and wait:**
   - **(a) A commit block** for GitHub Desktop, in this exact shape:
     ```
     SUMMARY: feat(engine): core rules, deal generator, seeded RNG
     DESCRIPTION:
     - what changed (bullets)
     - how to run / verify
     - open items
     ```
   - **(b) A status report file** saved to `docs/status/STATUS_P1-S<step>.md` (also paste its contents in chat) containing: what was built, how to test it, screenshots/GIF for UI steps, known issues, decisions made, open questions, and your **proposed plan for the next step**. The founder forwards this to the PM, who returns approval or edits.
4. **It must run from a clean clone**: `npm install && npm run dev`, and `npm test` green. Never deliver something you haven't run.
5. **Free everything, no secrets in git.** `.env.example` only. Vercel/Cloudflare Pages free tier, PostHog free tier. No paid APIs.
6. **Ask, don't guess.** One clear question beats a wrong assumption.

---

## 2. What Peaks is

**Peaks** is a mountain-climbing card game for the web. You clear a board of cards by tapping any exposed card that is one rank higher or lower than the card on your pile — every clear is a *step up the mountain*, chained clears build a **combo meter**, and clearing the whole board summits the peak. Every day there is one **Daily Summit**: a seeded board that every player in the world gets, with a streak counter, a global rank, and a one-tap share card. Underneath sits an endless **Expedition** mode with a coin economy (entry fee → per-card payout → combo multiplier → stake multiplier → gear/boosters → "one more step" continue) and a subscription, **Base Camp** ($4.99/mo): archive of past summits, streak-freeze, unlimited undo, cosmetic gear, friends leaderboard.

Under the hood the core rules are TriPeaks-style. **We never call it solitaire in the product.** It's Peaks. Marketing/SEO pages may say "solitaire-like" — the UI never does. This is deliberate: people understand it in 5 seconds, but it isn't lumped in with clone sites.

Why this design (short version; full market rationale in `docs/game_plan.md`):
- Puzzle is the only large mobile genre still growing in 2026; classic card games have the best retention curves in casual.
- The coin/stake/continue loop is lifted from Solitaire Grand Harvest (~$200M/yr, ~$32 revenue per US download).
- Daily seed + streak + share card is the Wordle acquisition loop — it's our $0 marketing.
- Web-first + Stripe = ~3% fees instead of 20–30% store cuts; wrap for stores later with Capacitor.
- Subscriptions convert on habit + convenience (archive, streak-save, no ads, unlimited undo), not on novelty — so the sub is designed around those.

---

## 3. Game rules (Phase 1 spec)

**Board.** 28 cards in three peaks: rows of 3 / 6 / 9 / 10 (top three rows face-down until both cards covering them are cleared; bottom row face-up). One face-up **pile** card. **Pack** of 23 face-down cards.
**Move.** Tap an exposed board card whose rank is ±1 from the pile card (Ace↔King wraps, suits don't matter). It moves onto the pile. Tapping the pack draws one card onto the pile (resets combo).
**Combo.** Consecutive clears without drawing increment the combo (1,2,3…). Combo meter fills visibly. Score per clear = 10 × combo. Peak-clear bonus +100 each; summit (all 28) bonus +500. Daily score = that total, tiebreak fewer draws.
**Undo.** Reverts the last move. Daily Summit: 3 undos. Free-play: unlimited (Phase 1).
**End.** Summit when board is empty. Stuck when the pack is empty and no legal move exists → show cleared count (e.g. 24/28).
**Hazards (Phase 1 gets ONE, ice; wind and others later).** Ice card: shows a frost overlay; needs to be tapped twice — first tap "cracks" it (no move), second tap moves it. Daily boards use 0–3 ice cards depending on the day's difficulty tier (rotates easy/medium/hard by weekday). Hazards are the "content" that keeps boards varied without hand-designed levels.
**Daily Summit.** Seed = integer from the UTC date `YYYYMMDD` fed to `mulberry32`. Same seed → identical board on every device, no server. Playable once per device per UTC day; after finishing, the results screen is shown on revisit with a countdown to the next summit.
**Streak.** +1 per consecutive UTC day with a completed Daily Summit (win or stuck both count as played). Missed day → 0. (Streak-freeze is a Base Camp feature in a later phase; leave a hook.)
**Share card** (copied to clipboard):
```
Peaks #12 ⛰️ Summit! ⭐ 1,340
🟩🟩🟩🟩🟩🟨🟩🟩🟩🟩🟦🟩🟩⬛🟩
🔥 7-day streak
peaks.gg
```
Emoji row = move log (🟩 clear, 🟨 draw, 🟦 ice crack, ⬛ undo), truncated to 40 with "…" if longer. Day number = days since launch date constant. URL from env var.

---

## 4. Tech stack (locked for Phase 1)

- **TypeScript + Vite**, vanilla DOM + CSS. No framework. Vitest for tests. ESLint + Prettier.
- **Engine is pure and UI-free**: `src/engine/` exports types and pure functions (`deal(seed, opts)`, `legalMoves(state)`, `applyMove(state, move)`, `undo(state)`, `score(state)`, `isSummit`, `isStuck`). Deterministic. Must be replayable from `(seed, moveList)` — we'll validate scores server-side later.
- **RNG:** `mulberry32`. **Persistence:** `localStorage` behind a `Store` interface (`src/store/`) so Supabase can replace it in Phase 2 without touching UI.
- **PWA:** `vite-plugin-pwa`, offline-playable, manifest + icons, install prompt after 2nd session.
- **Analytics:** PostHog behind `src/analytics.ts` (no-op without key). Events: `app_open, daily_start, daily_complete{won,cleared,score,draws}, undo, share_click, share_copied, freeplay_start, expedition_cta_click, pwa_install_prompt, pwa_installed`; every event carries `day_index, is_pwa, device`.
- **Hosting:** Vercel or Cloudflare Pages free tier with preview deploys.
- **Design:** warm, high-contrast, large pips (audience skews 45+); mountain/sky palette, light table by default + dark mode; card faces are code-generated SVG; one card back; motion 120–180ms ease-out; respect `prefers-reduced-motion`; ≥44px tap targets; works at 360px wide one-handed and on desktop.

```
peaks-daily-solitaire/
  docs/            game_plan.md, PEAKS_PHASE1.md, status/
  public/          icons, manifest assets
  src/
    engine/        types.ts rng.ts deal.ts rules.ts scoring.ts hazards.ts
    daily/         seed.ts streak.ts share.ts
    ui/            board.ts card.ts hud.ts modals.ts styles.css
    store/         Store.ts localStore.ts
    analytics.ts  main.ts
  tests/
  .env.example  README.md
```

---

## 5. Phase 1 — steps (each = plan → APPROVED → build → commit block + status report → wait)

**Step 1 — Scaffold.** Vite + TS + Vitest + ESLint/Prettier, `vite-plugin-pwa` wired (placeholder icons), `.env.example`, README skeleton, `docs/` with this file, folder structure with empty modules, deploy preview working. *Done when:* clean clone runs, `npm test` passes a trivial test, preview URL loads a "Peaks" placeholder.

**Step 2 — Engine.** Types, RNG, deal generator (28-card layout + pile + pack, face-down logic), legal moves, apply/undo, summit/stuck detection, scoring with combo, ice hazard. Full unit tests: same seed → identical deal; every legal move accepted and illegal rejected; face-down cards flip only when uncovered; A↔K wrap; undo restores exact prior state; ice needs two taps; scoring examples; replay `(seed, moves)` reproduces final state. *Done when:* tests green, engine has zero DOM imports.

**Step 3 — Daily & persistence.** Daily seed from UTC date, difficulty tier by weekday, once-per-day lock, day index from launch date constant, streak logic, `Store` interface + localStorage impl, countdown util. Tests for seed/day/streak edge cases (midnight UTC rollover, missed days). *Done when:* two devices with the same date produce the same board; streak logic tested.

**Step 4 — Board UI.** Responsive board, SVG cards, tap-to-move, pack draw, face-down flip animation, combo meter, HUD (score, draws left, undos left, combo), ice overlay + crack state, dark mode, reduced motion. *Done when:* fully playable free deal on phone + desktop; screenshots in status report.

**Step 5 — Daily Summit flow.** Landing → today's summit (first-time 1-line hint) → play → results modal (score, cleared, streak, day #, share button, "Expedition — coming soon" disabled CTA) → revisit shows results + countdown. Share card generation + clipboard + tests. *Done when:* full daily loop works end-to-end and share text matches spec.

**Step 6 — Free-play + analytics + PWA polish.** After the daily: "Practice climb" unlimited random deals with a "Next summit in HH:MM" banner; PostHog wrapper + all events; install prompt logic; real icons; Lighthouse mobile PWA + Performance ≥ 90; cross-device QA (iOS Safari, Android Chrome, desktop). *Done when:* Lighthouse screenshots attached, event list verified in PostHog (or console in no-op mode).

**Step 7 — MVP first draft.** Integration pass: bug bash on everything above, empty/edge states, copy polish, README complete (run, architecture, seed explanation, how to add a hazard), `docs/status/STATUS_P1-S7_MVP.md` with a demo GIF, known-issues list, and your recommended Phase 2 order (Expedition coin loop, Supabase auth + leaderboard, Stripe Base Camp). Tag the commit `v0.1.0-mvp`. *Done when:* the PM can open the preview URL on a phone, play today's summit, share it, and come back tomorrow for a new one.

**Out of scope for Phase 1 (do not build):** coins, stake multiplier, boosters/gear, continue/fail-offer, level map, auth, Supabase, Stripe, ads, server leaderboard, sound, wind/other hazards, Capacitor.

---

## 6. Your first reply

Send: (1) confirmation you've read this, (2) your plan for **Step 1** (and Step 2 if you're confident), (3) anything you'd change about the stack, rules, or scope, (4) questions. Then wait for `APPROVED`.
