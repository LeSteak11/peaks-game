import { describe, expect, it } from 'vitest';
import { buildDailyResult, completeDaily } from '../../src/daily/results';
import { dailyDealOptions, dailySeed } from '../../src/daily/seed';
import { deal } from '../../src/engine/deal';
import { applyMove, legalMoves, replay } from '../../src/engine/rules';
import type { GameState, Move } from '../../src/engine/types';
import { LocalStore } from '../../src/store/localStore';
import { fakeStorage } from '../store/fixtures';
import { makeState } from '../engine/fixtures';

const AUG31_2359 = Date.UTC(2026, 7, 31, 23, 59);
const SEP1_0001 = Date.UTC(2026, 8, 1, 0, 1);

/** Play a real daily to its end (random-legal), returning state + moves. */
function playDaily(nowMs: number): { state: GameState; moves: Move[] } {
  let state = deal(dailySeed(nowMs), dailyDealOptions(nowMs));
  const moves: Move[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const legal = legalMoves(state);
    if (legal.length === 0) break;
    const move = legal[0]!;
    state = applyMove(state, move);
    moves.push(move);
  }
  return { state, moves };
}

describe('buildDailyResult', () => {
  it('keys the record to the day the game STARTED, not the finish time', () => {
    // Started 23:59 Aug 31, finished 00:01 Sep 1 — locks Aug 31, leaves Sep 1 open.
    const { state, moves } = playDaily(AUG31_2359);
    const record = buildDailyResult(state, moves, AUG31_2359, SEP1_0001);
    expect(record.dateKey).toBe('2026-08-31');
    expect(record.seed).toBe(20260831);
    expect(record.completedAt).toBe(SEP1_0001);
  });

  it('captures tier, outcome, counters, and a replayable move list', () => {
    const now = Date.UTC(2026, 8, 4, 12); // 2026-09-04 is a Friday → hard, 3 ice
    const { state, moves } = playDaily(now);
    const record = buildDailyResult(state, moves, now, now);
    expect(record.tier).toBe('hard');
    expect(record.iceCount).toBe(3);
    expect(record.draws).toBe(state.draws);
    expect(record.moveLog).toEqual(state.moveLog);
    // The stored (seed, moves) pair reproduces the exact final state — Phase 2 contract.
    const replayed = replay(record.seed, dailyDealOptions(now), record.moves);
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(state));
  });
});

describe('completeDaily', () => {
  it('writes the record and advances the streak', () => {
    const store = new LocalStore(fakeStorage());
    const { state, moves } = playDaily(AUG31_2359);
    const { record, streak } = completeDaily(store, state, moves, AUG31_2359, AUG31_2359);
    expect(store.getDailyResult('2026-08-31')).toEqual(record);
    expect(streak).toEqual({ current: 1, best: 1, lastPlayedDay: '2026-08-31' });
  });

  it('is idempotent: a second completion for the same day changes nothing', () => {
    const store = new LocalStore(fakeStorage());
    const { state, moves } = playDaily(AUG31_2359);
    const first = completeDaily(store, state, moves, AUG31_2359, AUG31_2359);
    const again = completeDaily(store, makeState({}), [], AUG31_2359, AUG31_2359 + 5000);
    expect(again.record).toEqual(first.record);
    expect(store.getStreak()).toEqual(first.streak);
  });

  it('a cross-midnight finish still leaves the new day open (streak carries)', () => {
    const store = new LocalStore(fakeStorage());
    const day1 = playDaily(AUG31_2359);
    completeDaily(store, day1.state, day1.moves, AUG31_2359, SEP1_0001);
    expect(store.getDailyResult('2026-09-01')).toBeNull(); // Sep 1 unplayed

    const day2 = playDaily(SEP1_0001);
    const { streak } = completeDaily(store, day2.state, day2.moves, SEP1_0001, SEP1_0001);
    expect(streak).toEqual({ current: 2, best: 2, lastPlayedDay: '2026-09-01' });
  });
});
