import { describe, expect, it } from 'vitest';
import { applyMove, tapAction, undo } from '../../src/engine/rules';
import { pickIceSlots, ICE_ELIGIBLE_SLOTS } from '../../src/engine/hazards';
import { mulberry32 } from '../../src/engine/rng';
import { deal } from '../../src/engine/deal';
import { makeState, ranksWith } from './fixtures';

describe('ice hazard', () => {
  it('needs two taps: first cracks (no card moves), second clears', () => {
    const s0 = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], ice: { 20: 'intact' } });
    expect(tapAction(s0, 20)).toBe('crack');

    const s1 = applyMove(s0, { type: 'tap', slot: 20 });
    expect(s1.board[20]!.ice).toBe('cracked');
    expect(s1.board[20]!.cleared).toBe(false);
    expect(s1.pile).toEqual(s0.pile); // no card moved
    expect(s1.score).toBe(0);
    expect(s1.moveLog).toEqual(['crack']);

    const s2 = applyMove(s1, { type: 'tap', slot: 20 });
    expect(s2.board[20]!.cleared).toBe(true);
    expect(s2.pile[s2.pile.length - 1]!.rank).toBe(10);
    expect(s2.moveLog).toEqual(['crack', 'clear']);
  });

  it('can be cracked regardless of rank, but cleared only on a rank match', () => {
    // Rank 3 vs pile 9: never clearable, still crackable.
    const s0 = makeState({ boardRanks: ranksWith({ 20: 3 }), pile: [9], ice: { 20: 'intact' } });
    expect(tapAction(s0, 20)).toBe('crack');
    const s1 = applyMove(s0, { type: 'tap', slot: 20 });
    expect(s1.board[20]!.ice).toBe('cracked');
    expect(tapAction(s1, 20)).toBeNull(); // cracked but not adjacent → no move
  });

  it('cannot be cracked while covered', () => {
    const s = makeState({ ice: { 9: 'intact' } }); // slot 9 covered by 18+19
    expect(tapAction(s, 9)).toBeNull();
  });

  it('does not touch the combo in either direction', () => {
    // clear (combo 1) → crack (combo still 1) → clear (combo 2)
    const s0 = makeState({
      boardRanks: ranksWith({ 20: 10, 21: 11, 22: 12 }),
      pile: [9],
      ice: { 21: 'intact' },
    });
    const afterClear = applyMove(s0, { type: 'tap', slot: 20 });
    expect(afterClear.combo).toBe(1);
    const afterCrack = applyMove(afterClear, { type: 'tap', slot: 21 });
    expect(afterCrack.combo).toBe(1);
    expect(afterCrack.score).toBe(afterClear.score);
    const afterSecondClear = applyMove(afterCrack, { type: 'tap', slot: 21 });
    expect(afterSecondClear.combo).toBe(2);
    expect(afterSecondClear.score).toBe(afterClear.score + 20);
  });

  it('undo restores the frost and consumes an undo', () => {
    const s0 = makeState({
      boardRanks: ranksWith({ 20: 10 }),
      pile: [9],
      ice: { 20: 'intact' },
      undoLimit: 3,
    });
    const cracked = applyMove(s0, { type: 'tap', slot: 20 });
    const restored = undo(cracked);
    expect(restored.board[20]!.ice).toBe('intact');
    expect(restored.undosUsed).toBe(1);
    expect(restored.moveLog).toEqual(['crack', 'undo']);
  });
});

describe('ice placement', () => {
  it('is deterministic for the same rng seed', () => {
    expect(pickIceSlots(mulberry32(5), 3)).toEqual(pickIceSlots(mulberry32(5), 3));
  });

  it('returns distinct eligible slots, never the bottom row', () => {
    for (let seed = 0; seed < 50; seed++) {
      const slots = pickIceSlots(mulberry32(seed), 3);
      expect(new Set(slots).size).toBe(3);
      for (const s of slots) {
        expect(ICE_ELIGIBLE_SLOTS).toContain(s);
        expect(s).toBeLessThan(18);
      }
    }
  });

  it('caps the count at the eligible pool and floors at 0', () => {
    expect(pickIceSlots(mulberry32(1), 99)).toHaveLength(18);
    expect(pickIceSlots(mulberry32(1), 0)).toEqual([]);
    expect(pickIceSlots(mulberry32(1), -2)).toEqual([]);
  });

  it('deals place exactly iceCount intact ice cards outside the bottom row', () => {
    for (const iceCount of [0, 1, 2, 3]) {
      const s = deal(20260818, { iceCount });
      const iced = s.board.map((b, i) => ({ ...b, slot: i })).filter((b) => b.ice === 'intact');
      expect(iced).toHaveLength(iceCount);
      for (const b of iced) expect(b.slot).toBeLessThan(18);
    }
  });
});
