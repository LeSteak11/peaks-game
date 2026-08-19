import { describe, expect, it } from 'vitest';
import { dailySeed, dateKey } from '../../src/daily/seed';
import { EMPTY_STREAK, recordDailyPlayed } from '../../src/daily/streak';
import { LocalStore } from '../../src/store/localStore';
import { fakeStorage, sampleResult } from '../store/fixtures';

/**
 * PM-requested end-to-end rollover case (Step 3 approval): a player finishes the
 * daily at 23:59 UTC on Aug 31 and the next one at 00:01 UTC on Sep 1 — a two-minute
 * gap across a month boundary must count as two consecutive days.
 */
describe('UTC midnight rollover across a month boundary', () => {
  const aug31_2359 = Date.UTC(2026, 7, 31, 23, 59);
  const sep1_0001 = Date.UTC(2026, 8, 1, 0, 1);

  it('yields two distinct daily results and a streak of 2', () => {
    const store = new LocalStore(fakeStorage());

    // Night one: play and record.
    const day1Key = dateKey(aug31_2359);
    store.setDailyResult(
      sampleResult({ dateKey: day1Key, seed: dailySeed(aug31_2359), completedAt: aug31_2359 }),
    );
    store.setStreak(recordDailyPlayed(EMPTY_STREAK, day1Key));

    // Two minutes later: a brand-new summit is open.
    const day2Key = dateKey(sep1_0001);
    expect(day2Key).not.toBe(day1Key);
    expect(dailySeed(sep1_0001)).not.toBe(dailySeed(aug31_2359));
    expect(store.getDailyResult(day2Key)).toBeNull(); // lock does not carry over

    store.setDailyResult(
      sampleResult({ dateKey: day2Key, seed: dailySeed(sep1_0001), completedAt: sep1_0001 }),
    );
    store.setStreak(recordDailyPlayed(store.getStreak(), day2Key));

    expect(store.getStreak()).toEqual({ current: 2, best: 2, lastPlayedDay: '2026-09-01' });
    expect(store.getDailyResult('2026-08-31')!.seed).toBe(20260831);
    expect(store.getDailyResult('2026-09-01')!.seed).toBe(20260901);
  });
});
