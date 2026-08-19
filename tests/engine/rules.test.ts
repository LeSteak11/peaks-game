import { describe, expect, it } from 'vitest';
import {
  IllegalMoveError,
  applyMove,
  canUndo,
  clearedCount,
  isExposed,
  isFaceUp,
  isStuck,
  isSummit,
  legalMoves,
  ranksAdjacent,
  undo,
} from '../../src/engine/rules';
import { deal, BOTTOM_ROW_START, BOARD_SIZE } from '../../src/engine/deal';
import { makeState, ranksWith } from './fixtures';

describe('ranksAdjacent', () => {
  it('matches ±1 and wraps Ace↔King, ignoring suits', () => {
    expect(ranksAdjacent(5, 6)).toBe(true);
    expect(ranksAdjacent(6, 5)).toBe(true);
    expect(ranksAdjacent(1, 13)).toBe(true); // A↔K wrap
    expect(ranksAdjacent(13, 1)).toBe(true);
    expect(ranksAdjacent(1, 2)).toBe(true);
    expect(ranksAdjacent(5, 5)).toBe(false);
    expect(ranksAdjacent(5, 7)).toBe(false);
    expect(ranksAdjacent(2, 13)).toBe(false);
  });
});

describe('exposure and face-down flips', () => {
  it('exposes only the bottom row on a fresh deal', () => {
    const s = deal(31);
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      expect(isExposed(s, slot)).toBe(slot >= BOTTOM_ROW_START);
      expect(isFaceUp(s, slot)).toBe(slot >= BOTTOM_ROW_START);
    }
  });

  it('flips a covered card only when BOTH coverers are cleared', () => {
    // Row-2 slot 9 is covered by bottom slots 18 and 19.
    const oneCleared = makeState({ cleared: [18] });
    expect(isExposed(oneCleared, 9)).toBe(false);
    expect(isFaceUp(oneCleared, 9)).toBe(false);

    const bothCleared = makeState({ cleared: [18, 19] });
    expect(isExposed(bothCleared, 9)).toBe(true);
    expect(isFaceUp(bothCleared, 9)).toBe(true);
  });

  it('never reports a cleared slot as exposed or face-up', () => {
    const s = makeState({ cleared: [18] });
    expect(isExposed(s, 18)).toBe(false);
    expect(isFaceUp(s, 18)).toBe(false);
  });
});

describe('tap moves', () => {
  it('accepts an exposed card one rank above the pile', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9] });
    const next = applyMove(s, { type: 'tap', slot: 20 });
    expect(next.board[20]!.cleared).toBe(true);
    expect(next.pile[next.pile.length - 1]!.rank).toBe(10);
    expect(next.combo).toBe(1);
    expect(next.moveLog).toEqual(['clear']);
  });

  it('accepts one rank below and both wrap directions', () => {
    const below = makeState({ boardRanks: ranksWith({ 20: 8 }), pile: [9] });
    expect(applyMove(below, { type: 'tap', slot: 20 }).board[20]!.cleared).toBe(true);

    const aceOnKing = makeState({ boardRanks: ranksWith({ 20: 1 }), pile: [13] });
    expect(applyMove(aceOnKing, { type: 'tap', slot: 20 }).board[20]!.cleared).toBe(true);

    const kingOnAce = makeState({ boardRanks: ranksWith({ 20: 13 }), pile: [1] });
    expect(applyMove(kingOnAce, { type: 'tap', slot: 20 }).board[20]!.cleared).toBe(true);
  });

  it('rejects a non-adjacent rank', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 3 }), pile: [9] });
    expect(() => applyMove(s, { type: 'tap', slot: 20 })).toThrow(IllegalMoveError);
  });

  it('rejects a covered card even when its rank matches', () => {
    const s = makeState({ boardRanks: ranksWith({ 9: 10 }), pile: [9] });
    expect(() => applyMove(s, { type: 'tap', slot: 9 })).toThrow(IllegalMoveError);
  });

  it('rejects an already-cleared slot', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], cleared: [20] });
    expect(() => applyMove(s, { type: 'tap', slot: 20 })).toThrow(IllegalMoveError);
  });

  it('chains: a clear changes the pile card and re-opens moves', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 10, 21: 11 }), pile: [9] });
    const afterFirst = applyMove(s, { type: 'tap', slot: 20 });
    const afterSecond = applyMove(afterFirst, { type: 'tap', slot: 21 });
    expect(afterSecond.combo).toBe(2);
    expect(afterSecond.pile[afterSecond.pile.length - 1]!.rank).toBe(11);
  });
});

describe('draw', () => {
  it('moves the top pack card to the pile, counts the draw, resets combo', () => {
    const s0 = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], pack: [4, 7] });
    const s1 = applyMove(s0, { type: 'tap', slot: 20 }); // combo 1
    const s2 = applyMove(s1, { type: 'draw' });
    expect(s2.pack).toHaveLength(1);
    expect(s2.pile[s2.pile.length - 1]!.rank).toBe(7); // last pack entry is next draw
    expect(s2.draws).toBe(1);
    expect(s2.combo).toBe(0);
    expect(s2.moveLog).toEqual(['clear', 'draw']);
  });

  it('throws when the pack is empty', () => {
    const s = makeState({ pack: [] });
    expect(() => applyMove(s, { type: 'draw' })).toThrow(IllegalMoveError);
  });
});

describe('undo', () => {
  it('restores the exact prior state after a clear', () => {
    const s0 = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], pack: [4] });
    const s1 = applyMove(s0, { type: 'tap', slot: 20 });
    const s2 = undo(s1);
    expect(s2.board).toEqual(s0.board);
    expect(s2.pile).toEqual(s0.pile);
    expect(s2.pack).toEqual(s0.pack);
    expect(s2.combo).toBe(s0.combo);
    expect(s2.score).toBe(s0.score);
    expect(s2.draws).toBe(s0.draws);
    expect(s2.history).toHaveLength(0);
    expect(s2.undosUsed).toBe(1);
    expect(s2.moveLog).toEqual(['clear', 'undo']); // the log never rewinds
  });

  it('restores the exact prior state after a draw', () => {
    const s0 = makeState({ pack: [4, 7] });
    const s1 = applyMove(s0, { type: 'draw' });
    const s2 = applyMove(s1, { type: 'undo' });
    expect(s2.pack).toEqual(s0.pack);
    expect(s2.pile).toEqual(s0.pile);
    expect(s2.draws).toBe(0);
  });

  it('enforces the daily limit of 3', () => {
    let s = makeState({
      boardRanks: ranksWith({ 20: 10, 21: 10, 22: 10, 23: 10 }),
      pile: [9],
      undoLimit: 3,
    });
    for (const slot of [20, 21, 22]) {
      s = applyMove(s, { type: 'tap', slot });
      s = applyMove(s, { type: 'undo' });
    }
    expect(s.undosUsed).toBe(3);
    s = applyMove(s, { type: 'tap', slot: 23 });
    expect(canUndo(s)).toBe(false);
    expect(() => applyMove(s, { type: 'undo' })).toThrow(IllegalMoveError);
  });

  it('allows unlimited undos when undoLimit is null', () => {
    let s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], undoLimit: null });
    for (let i = 0; i < 10; i++) {
      s = applyMove(s, { type: 'tap', slot: 20 });
      s = applyMove(s, { type: 'undo' });
    }
    expect(s.undosUsed).toBe(10);
  });

  it('throws with nothing to undo', () => {
    expect(() => undo(makeState({}))).toThrow(IllegalMoveError);
  });
});

describe('legalMoves, summit, stuck', () => {
  it('lists exactly the legal taps plus draw', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 10, 25: 8 }), pile: [9], pack: [2] });
    expect(legalMoves(s)).toEqual([
      { type: 'tap', slot: 20 },
      { type: 'tap', slot: 25 },
      { type: 'draw' },
    ]);
  });

  it('omits draw when the pack is empty', () => {
    const s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], pack: [] });
    expect(legalMoves(s)).toEqual([{ type: 'tap', slot: 20 }]);
  });

  it('detects summit when all 28 are cleared', () => {
    const all = Array.from({ length: BOARD_SIZE }, (_, i) => i);
    const s = makeState({ cleared: all });
    expect(isSummit(s)).toBe(true);
    expect(clearedCount(s)).toBe(BOARD_SIZE);
    expect(isStuck(s)).toBe(false);
  });

  it('detects stuck: pack empty, no legal tap', () => {
    const s = makeState({ pile: [9], pack: [] }); // all board cards rank 5
    expect(isStuck(s)).toBe(true);
  });

  it('is not stuck while the pack has cards or a tap exists', () => {
    expect(isStuck(makeState({ pile: [9], pack: [2] }))).toBe(false);
    expect(isStuck(makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], pack: [] }))).toBe(
      false,
    );
  });
});
