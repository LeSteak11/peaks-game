# STATUS — Phase 1, Step 2: Engine

**Date:** 2026-08-18 · **Status: complete, 53 tests green**

## What was built

Pure, deterministic game engine in `src/engine/` — zero DOM imports (lint-enforced):

- **`types.ts`** — `Card`, `BoardSlot`, `GameState`, `Move` (tap / draw / undo), `IceState`,
  `Snapshot`, `DealOptions`. State is immutable; every function returns a new state.
- **`rng.ts`** — `mulberry32`, `nextInt`, deterministic Fisher–Yates shuffle.
- **`deal.ts`** — board geometry (3/6/9/10 rows, TriPeaks coverage graph as `coverers()`),
  `deal(seed, opts)`: seeded shuffle → 28 board + 1 pile + 23 pack. Enforces the opening
  guarantee (initial pile card matches ≥1 bottom-row card) by re-dealing on the same RNG
  stream, then draws ice placement from that stream — the whole deal is a pure function of
  `(seed, opts)`.
- **`rules.ts`** — `isExposed` / `isFaceUp` (rows 0–2 flip exactly when both coverers clear),
  `legalMoves`, `applyMove`, `undo` (snapshot-based: exact restoration; move log only ever
  grows), `canUndo` (budget: 3 for daily, unlimited for free play), `isSummit`, `isStuck`,
  `replay(seed, opts, moves)` — the Phase 2 server-validation contract.
- **`scoring.ts`** — 10 × combo per clear, +100 peak, +500 summit; constants exported.
- **`hazards.ts`** — ice: eligible slots (rows 0–2 only), seeded placement. Crack/clear
  handling lives in `rules.ts` per the two-tap spec.

All PM decisions from the 2026-08-18 approval are implemented and recorded in
`docs/DECISIONS.md` (crack = logged/undoable/combo-neutral; opening guarantee; tier table;
ice placement zone; combo baseline; solver-verified generator noted as Phase 2 candidate).

## How to test

```
npm test    # 53 tests, 7 files
npm run lint
npm run build
```

Test coverage (tests/engine/): seed determinism incl. the **100-run byte-identical JSON** test
with ice enabled · geometry/coverage graph · legal accepted + illegal rejected (non-adjacent,
covered, already-cleared, empty-pack draw) · A↔K wrap both directions · face-down flips only
when both coverers cleared · undo exactness for clears and draws, 3-undo limit, unlimited mode ·
ice two-tap, crack-any-rank, combo-neutrality, frost restored by undo, placement bounds ·
scoring worked examples (chain 10/20/30, draw reset, peak, summit stacking) · replay reproduces
final state for 30 random games incl. games with undos · fuzz invariants over 30 seeds
(52-card conservation, pile arithmetic, terminal state reached).

## Screenshots

None — engine only, no UI this step.

## Known issues

None known. One behavior deliberately unspecified-then-decided, flagged below.

## Decisions made (needs PM eyes)

- **Crack does not require a rank match** — any exposed iced card can be cracked whenever;
  only the clearing tap needs ±1. Rationale + two-line revert path in `docs/DECISIONS.md`.
- Pack draw order is defined as "last array element next" — internal detail, stable for replay.
- `legalMoves()` excludes undo (meta-move; UI uses `canUndo()`); stuck ignores undo availability.

## Open questions

1. Confirm the crack-any-rank decision above (or I flip it in Step 4 before the UI bakes it in).
2. Still need: real launch date for `VITE_LAUNCH_DATE`, and `docs/game_plan.md` for the repo.

## Proposed plan for next step (Step 3 — Daily & persistence)

- `src/daily/seed.ts`: UTC date → `YYYYMMDD` integer seed; `TIER_BY_WEEKDAY` constant per the
  approved rotation; `dealOptionsFor(date)` (medium days: 2 ice Wed/Sat, 1 Tue/Thu);
  `dayIndex(date)` from the launch-date constant; countdown-to-next-summit util.
- `src/daily/streak.ts`: streak increment on consecutive played UTC days (win or stuck), reset
  on a missed day, streak-freeze hook left for Base Camp.
- `src/store/Store.ts` + `localStore.ts`: `Store` interface (get/set typed keys: daily result by
  date, streak, last played) with a localStorage impl, swappable for Supabase in Phase 2.
- Once-per-day lock: daily state keyed by UTC date string; revisit shows stored result.
- Tests: seed stability across timezones (UTC only), midnight rollover, tier mapping for all 7
  weekdays, day index, streak continue/reset/edge cases (same-day replays don't double-count),
  store round-trips with a fake storage.
- Files touched: `src/daily/seed.ts`, `src/daily/streak.ts`, `src/store/Store.ts`,
  `src/store/localStore.ts`, new tests. Risks: date math off-by-ones — mitigated by
  fixed-timestamp tests. Done when: same date → same board everywhere; streak logic fully tested.
