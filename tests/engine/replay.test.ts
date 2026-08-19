import { describe, expect, it } from 'vitest';
import type { GameState, Move } from '../../src/engine/types';
import { applyMove, canUndo, isStuck, isSummit, legalMoves, replay } from '../../src/engine/rules';
import { deal } from '../../src/engine/deal';
import { mulberry32, nextInt, type Rng } from '../../src/engine/rng';

/** Plays a seeded-random legal game to completion; returns the moves and final state. */
function playRandomGame(
  seed: number,
  opts: { iceCount?: number; undoLimit?: number | null },
  choiceRng: Rng,
  undoChance = 0,
): { moves: Move[]; final: GameState } {
  let state = deal(seed, opts);
  const moves: Move[] = [];
  for (let guard = 0; guard < 500; guard++) {
    if (isSummit(state) || isStuck(state)) break;
    let move: Move;
    if (undoChance > 0 && canUndo(state) && choiceRng() < undoChance) {
      move = { type: 'undo' };
    } else {
      const legal = legalMoves(state);
      move = legal[nextInt(choiceRng, legal.length)]!;
    }
    state = applyMove(state, move);
    moves.push(move);
  }
  return { moves, final: state };
}

describe('replay', () => {
  it('reproduces the exact final state from (seed, opts, moves) — the server-validation contract', () => {
    for (let seed = 100; seed < 120; seed++) {
      const opts = { iceCount: seed % 4, undoLimit: null };
      const { moves, final } = playRandomGame(seed, opts, mulberry32(seed * 7 + 1));
      const replayed = replay(seed, opts, moves);
      expect(JSON.stringify(replayed)).toBe(JSON.stringify(final));
    }
  });

  it('reproduces games that include undos', () => {
    for (let seed = 200; seed < 210; seed++) {
      const opts = { iceCount: 2, undoLimit: null };
      const { moves, final } = playRandomGame(seed, opts, mulberry32(seed), 0.15);
      const replayed = replay(seed, opts, moves);
      expect(JSON.stringify(replayed)).toBe(JSON.stringify(final));
      expect(replayed.moveLog).toEqual(final.moveLog);
    }
  });
});

describe('fuzz invariants', () => {
  it('conserves all 52 cards and keeps state consistent across random games', () => {
    for (let seed = 300; seed < 330; seed++) {
      const { moves, final } = playRandomGame(
        seed,
        { iceCount: seed % 4, undoLimit: null },
        mulberry32(seed + 13),
        0.05,
      );
      // Card conservation: uncleared board + pile + pack = all 52 unique ids.
      const ids = [
        ...final.board.filter((b) => !b.cleared).map((b) => b.card.id),
        ...final.pile.map((c) => c.id),
        ...final.pack.map((c) => c.id),
      ];
      expect(ids).toHaveLength(52);
      expect(new Set(ids).size).toBe(52);
      // Cleared cards are exactly the pile minus the initial card minus draws (net of undos).
      const clearedOnBoard = final.board.filter((b) => b.cleared).length;
      expect(final.pile.length).toBe(1 + final.draws + clearedOnBoard);
      expect(final.score).toBeGreaterThanOrEqual(0);
      expect(final.moveLog.length).toBe(moves.length);
      // Terminal: game ended in summit or stuck (guard never trips at 500 for a 52-card game).
      expect(isSummit(final) || isStuck(final)).toBe(true);
    }
  });
});
