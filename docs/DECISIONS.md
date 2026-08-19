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

## 2026-08-18 — dev decision (flagged for PM review)

- **Cracking does not require a rank match.** Any _exposed_ iced card can be cracked at any time;
  only the second tap (the actual clear) needs the ±1 rank match. Rationale: it makes ice
  strategic — you can pre-crack during a lull — instead of a mandatory double-tap. The engine
  isolates this in `tapAction()` (`src/engine/rules.ts`), so flipping to "crack requires rank
  match" is a two-line change if the PM prefers it.
- **Undo is not listed by `legalMoves()`.** It's a meta-move with its own budget; UI should call
  `canUndo()`. Stuck detection intentionally ignores undo availability.
