# STATUS — Phase 1, Step 3: Daily & persistence

**Date:** 2026-08-18 · **Status: complete, 82 tests green (29 new)**

## What was built

- **`src/daily/seed.ts`** — `dailySeed(ms)`: UTC date → `YYYYMMDD` integer;
  `TIER_BY_WEEKDAY` single exported constant with the approved rotation (Sun/Mon easy·0,
  Tue/Thu medium·1, Wed/Sat medium·2, Fri hard·3); `dailyDealOptions(ms)` (tier ice +
  `DAILY_UNDO_LIMIT = 3`); `dayIndex(ms)` (launch date = day 1, from `VITE_LAUNCH_DATE`,
  placeholder `2026-09-01`); `dateKey(ms)` canonical `YYYY-MM-DD`; countdown utils
  (`msUntilNextUtcDay`, `formatCountdown` → `HH:MM`). All functions take explicit
  timestamps — tests pin exact instants, no clock mocking.
- **`src/daily/streak.ts`** — `recordDailyPlayed` (+1 consecutive UTC day, win or stuck;
  idempotent per day; reset to 1 after a miss), **`best` persisted** per Step 3 additions,
  `effectiveStreak` for display (missed day shows 0 before the next play). Streak-freeze
  hook documented at the exact branch where Base Camp will slot in.
- **`src/store/Store.ts`** — persistence interface: `DailyResultRecord` (seed, day index,
  tier, outcome, score, draws, undos, **full `moves` list + display `moveLog`**) and
  streak get/set. Record-exists-for-today IS the once-per-day lock; `seed` + `moves` is
  the Phase 2 leaderboard validation payload.
- **`src/store/localStore.ts`** — `LocalStore` over a `StorageLike` (in-memory fake in
  tests), keys under `peaks.*`; **`schemaVersion` stamped, ordered no-op migration hook**
  (`MIGRATIONS` + `runMigrations`) wired now; corrupt JSON reads as absent instead of
  crashing.
- Docs: crack-any-rank confirmation + **"ice refreezes on draw" Phase 2 tuning candidate**
  recorded in `docs/DECISIONS.md` (not built); launch-date re-anchor note added to README.

## How to test

```
npm test        # 82 tests, 11 files
npm run lint
npm run build
```

New coverage: seed constant across a UTC day, rolls at midnight, month + year boundaries ·
all 7 weekday tiers against real 2026 dates · **two-devices test**: morning vs evening
timestamps on the same UTC day produce byte-identical deals through the full
seed→tier→deal pipeline · day index incl. pre-launch ≤ 0 · countdown math + formatting ·
streak: first play, consecutive, same-day idempotence, missed-day reset preserving best,
`best` high-water behavior, display zeroing · store: round-trips incl. moves/moveLog,
lock primitive, per-day separation, corrupt data, version stamping, migration ordering ·
**PM-requested rollover test**: plays at Aug 31 23:59 UTC and Sep 1 00:01 UTC → two
distinct daily results, streak = 2 (`tests/daily/rollover.test.ts`).

## Screenshots

None — no UI this step (nothing is wired to `main.ts` yet; that's Steps 4–5).

## Known issues

None known.

## Decisions made

- Store keys namespaced `peaks.*`; storage injected via `StorageLike` so tests never touch
  real localStorage and Supabase can implement `Store` in Phase 2.
- An unreadable `schemaVersion` value is treated as a fresh install at the current schema
  (defensive; can't brick the app).
- `effectiveStreak` treats "last played yesterday, not yet today" as still-alive — the
  streak shows through midnight until the day is actually missed.

## Open questions

None — all prior items answered (crack-any-rank confirmed; launch date placeholder stands;
game_plan.md is the founder's task).

## Proposed plan for next step (Step 4 — Board UI)

- **Files:** `src/ui/card.ts` (SVG card faces — large warm pips, one back design),
  `src/ui/board.ts` (28-slot layout + pack + pile, tap handling, flip animation),
  `src/ui/hud.ts` (score, draws left, undos left, combo meter), `src/ui/styles.css`
  (board layout, ice overlay + crack state, dark mode), `src/main.ts` (wire a free-play
  deal to the board for this step).
- **Approach:** render from `GameState` only — UI subscribes to a tiny game-controller
  wrapper around the engine; every tap maps to `applyMove` and re-renders diffs. CSS
  transforms for card positions (percent-based, one layout for 360px→desktop);
  120–180 ms ease-out motion, `prefers-reduced-motion` honored; ≥44 px tap targets;
  ice = frost overlay with a distinct cracked visual state.
- **Tests:** engine stays the tested core; UI step adds smoke-level DOM tests (renders 28
  cards, tap dispatches the right move, HUD reflects state) via jsdom. Manual QA: phone
  (360px) + desktop, light/dark, reduced motion.
- **Risks:** overlap/z-order of the three peaks at narrow widths — mitigated by
  percent-based coordinates tuned at 360px first.
- **Done when:** a full free-play deal is playable start-to-finish on phone + desktop;
  screenshots (light, dark, ice states, combo meter) in the status report.
