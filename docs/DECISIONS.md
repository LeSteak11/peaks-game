# Decisions log

Rule and design decisions that aren't obvious from the code, with who made them and when.

## 2026-08-18 — PM decisions (Step 2 approval)

- **Ice crack is a move in its own right.** Logged (🟦), undoable (undo restores the frost), and
  undoing it consumes an undo like any other. Cracking neither resets nor increments the combo.
- **Unwinnable dailies are allowed in Phase 1.** A shared "stuck at 24/28" is still comparable.
  Hard rule the generator guarantees: the initial pile card always has ≥1 legal move among the 10
  bottom-row cards. The generator re-deals by advancing the same RNG stream until this holds, so
  boards stay identical on every device. **A solver-verified generator is a Phase 2 candidate.**
- **Difficulty tiers (by UTC weekday):** Mon easy, Tue medium, Wed medium, Thu medium, Fri hard,
  Sat medium, Sun easy. Ice counts: easy 0 · medium 1–2 (2 on Wed/Sat, 1 on Tue/Thu) · hard 3.
  Single exported constant (lands in `src/daily/seed.ts`, Step 3).
- **Ice placement:** any board slot **except** the 10 bottom-row face-up cards, drawn from the
  deal's seeded RNG stream.
- **Combo baseline:** first clear after a draw (or at game start) scores 10×1, next consecutive
  10×2, etc. Draw resets to 0. Peak (+100) / summit (+500) bonuses stack on top and never affect
  the combo.

## 2026-08-18 — PM confirmations (Step 3 approval)

- **Crack-any-rank: confirmed for Phase 1.** On record: requiring a rank match on the crack
  changes nothing (the pile doesn't move on a crack, so the second tap is legal immediately) —
  friction without depth. Crack-any-rank lets players "prep" the board. Known cost: ice is a
  pacing/texture mechanic, not a difficulty mechanic, in Phase 1.
- **Phase 2 tuning candidate — do not build now:** _ice refreezes when the player draws from the
  pack._ That single rule gives ice teeth (crack-then-clear-before-you-draw) without touching the
  tap model.
- **`VITE_LAUNCH_DATE` placeholder `2026-09-01` (UTC) stands.** The day index will be re-anchored
  to the real launch date before public launch (also noted in README).

## 2026-08-19 — PM decisions (Step 6 approval; overrides two Step 5 dev decisions below)

- **Stuck is a SOFT state while undos remain.** Undo-out-of-stuck is the entire reason a daily
  has 3 undos. Pack dims, status shows "Stuck — N/28", Undo stays enabled, and a "Finish climb"
  button appears. Finalizes on Finish, or automatically at 0 undos. _(Implemented Step 6.)_
- **Mid-game refresh must resume exactly** — same board, undos consumed and all. A refresh was
  a cheat vector (free retry with knowledge of the face-down cards). In-progress daily
  (seed + moves) persists in the Store after every move; reload restores via
  `replay` + `controller.restore()`. _(Implemented Step 6.)_
- `VITE_LAUNCH_DATE` provisionally `2026-08-19` so QA day indices are positive; re-anchor at launch.
- PWA install prompt must never interrupt a game — results modal (or landing) only.
- Practice banner copy: "Practice climb · Next summit in HH:MM"; no score persistence for practice.

## 2026-08-19 — dev decisions (Step 5; the first two were superseded by the PM above)

- **Stuck finalizes the daily immediately, even with undos remaining.** The spec defines stuck
  as an end state. The engine supports undoing out of stuck, so an "undo mercy" is a small
  change if ever wanted.
- **Mid-game refresh restarts the daily** (same board, fresh state) — the once-per-day lock
  applies on completion. In-progress persistence (`controller.restore` + stored moves) is a
  Phase 2 candidate.
- **Cross-midnight completions are keyed to the day the game started** — finishing at 00:01 UTC
  locks yesterday's board and leaves today's summit open (streak carries; tested).

## 2026-08-18 — dev decision (confirmed by PM above)

- **Cracking does not require a rank match.** Any _exposed_ iced card can be cracked at any time;
  only the second tap (the actual clear) needs the ±1 rank match. Rationale: it makes ice
  strategic — you can pre-crack during a lull — instead of a mandatory double-tap. The engine
  isolates this in `tapAction()` (`src/engine/rules.ts`), so flipping to "crack requires rank
  match" is a two-line change if the PM prefers it.
- **Undo is not listed by `legalMoves()`.** It's a meta-move with its own budget; UI should call
  `canUndo()`. Stuck detection intentionally ignores undo availability.
