import { describe, expect, it } from 'vitest';
import { completeDaily, dailyPhase, loadInProgress } from '../../src/daily/results';
import { dailyDealOptions, dailySeed, dateKey } from '../../src/daily/seed';
import { deal } from '../../src/engine/deal';
import { applyMove, isStuck, legalMoves, undo } from '../../src/engine/rules';
import type { GameState, Move } from '../../src/engine/types';
import { LocalStore } from '../../src/store/localStore';
import { fakeStorage } from '../store/fixtures';
import { makeState, ranksWith } from '../engine/fixtures';

const NOW = Date.UTC(2026, 8, 2, 12); // 2026-09-02

describe('dailyPhase — soft stuck (PM, Step 6)', () => {
  it('is soft-stuck while undos remain, and undoing re-opens the game', () => {
    // Pack has one card; board has a 10 playable on the 9 pile. Draw the pack dry →
    // stuck. Undo the draw → playing again → clear the 10 → different outcome.
    const start = makeState({
      boardRanks: ranksWith({ 20: 10 }),
      pile: [9],
      pack: [3],
      undoLimit: 3,
    });
    const drewPackDry = applyMove(start, { type: 'draw' }); // pile top 3 — 10 no longer legal
    expect(isStuck(drewPackDry)).toBe(true);
    expect(dailyPhase(drewPackDry)).toBe('soft-stuck'); // NOT final — 3 undos left

    const undone = undo(drewPackDry);
    expect(dailyPhase(undone)).toBe('playing'); // continue after undo-out-of-stuck
    const cleared = applyMove(undone, { type: 'tap', slot: 20 });
    expect(cleared.score).toBeGreaterThan(drewPackDry.score); // different outcome
  });

  it('finalizes automatically when stuck with 0 undos left', () => {
    let s = makeState({
      boardRanks: ranksWith({ 20: 10, 21: 11, 22: 10 }),
      pile: [9],
      pack: [],
      undoLimit: 3,
    });
    // Burn the full undo budget on the same tap.
    for (let i = 0; i < 3; i++) {
      s = applyMove(s, { type: 'tap', slot: 20 });
      s = applyMove(s, { type: 'undo' });
    }
    // Clear the 10→11→10 chain; now nothing is playable and the pack is empty.
    for (const slot of [20, 21, 22]) s = applyMove(s, { type: 'tap', slot });
    expect(isStuck(s)).toBe(true);
    expect(s.undosUsed).toBe(3);
    expect(dailyPhase(s)).toBe('final'); // auto-finalize: no undos left
  });

  it('summit is always final; history alone never blocks finalization', () => {
    const all = Array.from({ length: 28 }, (_, i) => i);
    expect(dailyPhase(makeState({ cleared: all }))).toBe('final');
  });
});

describe('loadInProgress — mid-game refresh resume (PM, Step 6)', () => {
  function playSome(nowMs: number, count: number): { state: GameState; moves: Move[] } {
    let state = deal(dailySeed(nowMs), dailyDealOptions(nowMs));
    const moves: Move[] = [];
    for (let i = 0; i < count; i++) {
      const legal = legalMoves(state);
      if (legal.length === 0) break;
      state = applyMove(state, legal[0]!);
      moves.push(legal[0]!);
    }
    return { state, moves };
  }

  it('restores the exact mid-game state — moves, undos, and all', () => {
    const store = new LocalStore(fakeStorage());
    let { state, moves } = playSome(NOW, 5);
    state = applyMove(state, { type: 'undo' }); // consume an undo, then "refresh"
    moves = [...moves, { type: 'undo' }];
    store.setInProgressDaily({ dateKey: dateKey(NOW), seed: state.seed, moves });

    const resumed = loadInProgress(store, NOW);
    expect(resumed).not.toBeNull();
    expect(JSON.stringify(resumed!.state)).toBe(JSON.stringify(state));
    expect(resumed!.state.undosUsed).toBe(1); // undo stays consumed after refresh
  });

  it('ignores and clears a stale in-progress from a previous day', () => {
    const store = new LocalStore(fakeStorage());
    const { state, moves } = playSome(NOW, 3);
    store.setInProgressDaily({ dateKey: dateKey(NOW), seed: state.seed, moves });

    const nextDay = NOW + 86_400_000;
    expect(loadInProgress(store, nextDay)).toBeNull();
    expect(store.getInProgressDaily()).toBeNull(); // cleared
  });

  it('ignores an in-progress entry once the day is completed, and completeDaily clears it', () => {
    const store = new LocalStore(fakeStorage());
    const { state, moves } = playSome(NOW, 3);
    store.setInProgressDaily({ dateKey: dateKey(NOW), seed: state.seed, moves });
    completeDaily(store, state, moves, NOW, NOW);
    expect(store.getInProgressDaily()).toBeNull();
    expect(loadInProgress(store, NOW)).toBeNull();
  });

  it('abandons a corrupt move list instead of crashing', () => {
    const store = new LocalStore(fakeStorage());
    store.setInProgressDaily({
      dateKey: dateKey(NOW),
      seed: dailySeed(NOW),
      moves: [{ type: 'tap', slot: 0 }], // illegal first move → replay throws
    });
    expect(loadInProgress(store, NOW)).toBeNull();
    expect(store.getInProgressDaily()).toBeNull();
  });
});

describe('store additions', () => {
  it('round-trips in-progress state and counts sessions', () => {
    const store = new LocalStore(fakeStorage());
    expect(store.getInProgressDaily()).toBeNull();
    const progress = { dateKey: '2026-09-02', seed: 20260902, moves: [{ type: 'draw' as const }] };
    store.setInProgressDaily(progress);
    expect(store.getInProgressDaily()).toEqual(progress);
    store.clearInProgressDaily();
    expect(store.getInProgressDaily()).toBeNull();

    expect(store.getSessionCount()).toBe(0);
    expect(store.incrementSessionCount()).toBe(1);
    expect(store.incrementSessionCount()).toBe(2);
    expect(store.getSessionCount()).toBe(2);
  });
});
