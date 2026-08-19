import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  BOTTOM_ROW_START,
  PACK_SIZE,
  coverers,
  deal,
  rowOf,
} from '../../src/engine/deal';
import { ranksAdjacent } from '../../src/engine/rules';

describe('board geometry', () => {
  it('maps slots to rows 3/6/9/10', () => {
    expect([0, 2].map(rowOf)).toEqual([0, 0]);
    expect([3, 8].map(rowOf)).toEqual([1, 1]);
    expect([9, 17].map(rowOf)).toEqual([2, 2]);
    expect([18, 27].map(rowOf)).toEqual([3, 3]);
  });

  it('has the TriPeaks coverage graph', () => {
    expect(coverers(0)).toEqual([3, 4]);
    expect(coverers(1)).toEqual([5, 6]);
    expect(coverers(2)).toEqual([7, 8]);
    expect(coverers(3)).toEqual([9, 10]);
    expect(coverers(4)).toEqual([10, 11]);
    expect(coverers(7)).toEqual([15, 16]);
    expect(coverers(8)).toEqual([16, 17]);
    expect(coverers(9)).toEqual([18, 19]);
    expect(coverers(17)).toEqual([26, 27]);
    for (let s = BOTTOM_ROW_START; s < BOARD_SIZE; s++) expect(coverers(s)).toEqual([]);
    // Every coverer is a real slot in the row directly below.
    for (let s = 0; s < BOTTOM_ROW_START; s++) {
      for (const c of coverers(s)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(BOARD_SIZE);
        expect(rowOf(c)).toBe(rowOf(s) + 1);
      }
    }
  });
});

describe('deal', () => {
  it('lays out 28 board cards, 1 pile card, 23 pack cards — all 52 unique', () => {
    const s = deal(123);
    expect(s.board).toHaveLength(BOARD_SIZE);
    expect(s.pile).toHaveLength(1);
    expect(s.pack).toHaveLength(PACK_SIZE);
    const ids = [
      ...s.board.map((b) => b.card.id),
      ...s.pile.map((c) => c.id),
      ...s.pack.map((c) => c.id),
    ];
    expect(new Set(ids).size).toBe(52);
  });

  it('is deterministic: same seed and options → byte-identical JSON on 100 runs', () => {
    // Full-pipeline determinism (PM addition): ice placement also draws from the RNG.
    const reference = JSON.stringify(deal(20260818, { iceCount: 3, undoLimit: 3 }));
    for (let run = 0; run < 100; run++) {
      expect(JSON.stringify(deal(20260818, { iceCount: 3, undoLimit: 3 }))).toBe(reference);
    }
  });

  it('differs across seeds', () => {
    expect(JSON.stringify(deal(1).board)).not.toBe(JSON.stringify(deal(2).board));
  });

  it('guarantees the opening move: pile card matches ≥1 bottom-row card (500 seeds)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const s = deal(seed);
      const pileRank = s.pile[0]!.rank;
      const hasMove = s.board
        .slice(BOTTOM_ROW_START)
        .some((slot) => ranksAdjacent(slot.card.rank, pileRank));
      expect(hasMove).toBe(true);
    }
  });

  it('starts with zero score, combo, draws, undos, log, and history', () => {
    const s = deal(55, { iceCount: 1 });
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.draws).toBe(0);
    expect(s.undosUsed).toBe(0);
    expect(s.moveLog).toEqual([]);
    expect(s.history).toEqual([]);
    expect(s.board.every((b) => !b.cleared)).toBe(true);
  });

  it('defaults to no ice and unlimited undo', () => {
    const s = deal(9);
    expect(s.board.every((b) => b.ice === 'none')).toBe(true);
    expect(s.undoLimit).toBeNull();
  });
});
