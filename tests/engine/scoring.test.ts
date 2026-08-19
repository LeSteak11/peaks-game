import { describe, expect, it } from 'vitest';
import { applyMove } from '../../src/engine/rules';
import { score, CLEAR_BASE, PEAK_BONUS, SUMMIT_BONUS } from '../../src/engine/scoring';
import { BOARD_SIZE } from '../../src/engine/deal';
import { makeState, ranksWith } from './fixtures';

describe('scoring', () => {
  it('scores 10 × combo per clear: 10, 20, 30 for a 3-chain', () => {
    let s = makeState({ boardRanks: ranksWith({ 20: 10, 21: 11, 22: 12 }), pile: [9] });
    s = applyMove(s, { type: 'tap', slot: 20 });
    expect(score(s)).toBe(10);
    s = applyMove(s, { type: 'tap', slot: 21 });
    expect(score(s)).toBe(30);
    s = applyMove(s, { type: 'tap', slot: 22 });
    expect(score(s)).toBe(60);
  });

  it('resets the combo (not the score) on a draw', () => {
    let s = makeState({ boardRanks: ranksWith({ 20: 10, 21: 4 }), pile: [9], pack: [3] });
    s = applyMove(s, { type: 'tap', slot: 20 }); // 10 × 1
    s = applyMove(s, { type: 'draw' }); // pile top 3, combo 0
    s = applyMove(s, { type: 'tap', slot: 21 }); // 4 on 3: 10 × 1 again
    expect(score(s)).toBe(20);
    expect(s.combo).toBe(1);
  });

  it('adds the peak bonus when a peak top is cleared', () => {
    // Slot 0 exposed: its coverers 3,4 (and everything else except slot 0) cleared.
    const cleared = Array.from({ length: BOARD_SIZE }, (_, i) => i).filter(
      (i) => i !== 0 && i !== 20,
    );
    let s = makeState({ boardRanks: ranksWith({ 0: 10, 20: 8 }), pile: [9], cleared });
    s = applyMove(s, { type: 'tap', slot: 0 });
    expect(score(s)).toBe(CLEAR_BASE * 1 + PEAK_BONUS);
  });

  it('adds the summit bonus on the final clear (stacked with peak bonus)', () => {
    const cleared = Array.from({ length: BOARD_SIZE }, (_, i) => i).filter((i) => i !== 0);
    let s = makeState({ boardRanks: ranksWith({ 0: 10 }), pile: [9], cleared });
    s = applyMove(s, { type: 'tap', slot: 0 });
    // Final card is also a peak top: 10×1 + 100 + 500.
    expect(score(s)).toBe(CLEAR_BASE + PEAK_BONUS + SUMMIT_BONUS);
  });

  it('exports the spec constants', () => {
    expect(CLEAR_BASE).toBe(10);
    expect(PEAK_BONUS).toBe(100);
    expect(SUMMIT_BONUS).toBe(500);
  });
});
