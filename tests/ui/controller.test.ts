import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController } from '../../src/ui/controller';
import { legalMoves, replay } from '../../src/engine/rules';
import type { GameState, Move } from '../../src/engine/types';

function firstTap(state: GameState): Move & { type: 'tap' } {
  const tap = legalMoves(state).find((m): m is Move & { type: 'tap' } => m.type === 'tap');
  if (!tap) throw new Error('fixture seed has no tap — pick another seed');
  return tap;
}

describe('GameController', () => {
  it('notifies subscribers on newGame and immediately on late subscribe', () => {
    const c = new GameController(0);
    const seen: GameState[] = [];
    c.subscribe((s) => seen.push(s));
    c.newGame(42);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.seed).toBe(42);

    const late: GameState[] = [];
    c.subscribe((s) => late.push(s));
    expect(late).toHaveLength(1); // current state delivered on subscribe
  });

  it('applies legal taps and reports success', () => {
    const c = new GameController(0);
    c.newGame(42);
    const tap = firstTap(c.getState());
    expect(c.tap(tap.slot)).toBe(true);
    expect(c.getState().board[tap.slot]!.cleared).toBe(true);
  });

  it('rejects illegal taps without throwing, emitting, or changing state', () => {
    const c = new GameController(0);
    c.newGame(42);
    const before = c.getState();
    let emits = 0;
    c.subscribe(() => emits++); // 1 immediate
    expect(c.tap(0)).toBe(false); // slot 0 is covered on a fresh deal
    expect(c.getState()).toBe(before);
    expect(emits).toBe(1);
  });

  it('draws while the pack has cards, refuses when empty', () => {
    const c = new GameController(0);
    c.newGame(42);
    for (let i = 0; i < 23; i++) expect(c.draw()).toBe(true);
    expect(c.getState().pack).toHaveLength(0);
    expect(c.draw()).toBe(false);
  });

  it('undoes when possible, refuses with no history', () => {
    const c = new GameController(0);
    c.newGame(42);
    expect(c.undo()).toBe(false);
    c.draw();
    expect(c.undo()).toBe(true);
    expect(c.getState().pack).toHaveLength(23);
  });

  it('records every accepted move — replaying them reproduces the exact state', () => {
    const c = new GameController(0);
    const opts = { iceCount: 2, undoLimit: null };
    c.newGame(42, opts);
    c.tap(0); // illegal — must NOT be recorded
    const tap = firstTap(c.getState());
    c.tap(tap.slot);
    c.draw();
    c.undo();
    expect(c.getMoves()).toEqual([
      { type: 'tap', slot: tap.slot },
      { type: 'draw' },
      { type: 'undo' },
    ]);
    const replayed = replay(42, opts, c.getMoves());
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(c.getState()));
  });

  it('resets the recorded moves on newGame', () => {
    const c = new GameController(0);
    c.newGame(42);
    c.draw();
    c.newGame(43);
    expect(c.getMoves()).toEqual([]);
  });

  it('stops notifying after unsubscribe', () => {
    const c = new GameController(0);
    c.newGame(42);
    let emits = 0;
    const unsub = c.subscribe(() => emits++); // 1
    unsub();
    c.draw();
    expect(emits).toBe(1);
  });

  describe('input lock (double-tap guard)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('swallows a second move inside the lock window and accepts it after', () => {
      vi.setSystemTime(1_000_000);
      const c = new GameController(150);
      c.newGame(42);
      expect(c.draw()).toBe(true);
      expect(c.draw()).toBe(false); // same instant — locked
      vi.setSystemTime(1_000_100);
      expect(c.draw()).toBe(false); // 100ms — still locked
      vi.setSystemTime(1_000_151);
      expect(c.draw()).toBe(true); // lock expired
    });

    it('newGame clears the lock', () => {
      vi.setSystemTime(2_000_000);
      const c = new GameController(150);
      c.newGame(42);
      c.draw();
      c.newGame(43);
      expect(c.draw()).toBe(true);
    });
  });
});
