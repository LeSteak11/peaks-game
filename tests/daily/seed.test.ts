import { describe, expect, it } from 'vitest';
import {
  DAILY_UNDO_LIMIT,
  TIER_BY_WEEKDAY,
  dailyDealOptions,
  dailySeed,
  dateKey,
  dayIndex,
  dayTier,
  formatCountdown,
  msUntilNextUtcDay,
} from '../../src/daily/seed';
import { deal } from '../../src/engine/deal';

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s);

describe('dailySeed / dateKey', () => {
  it('encodes the UTC date as YYYYMMDD', () => {
    expect(dailySeed(utc(2026, 8, 18))).toBe(20260818);
    expect(dateKey(utc(2026, 8, 18))).toBe('2026-08-18');
    expect(dateKey(utc(2026, 1, 5))).toBe('2026-01-05'); // zero-padded
  });

  it('is constant across the whole UTC day', () => {
    expect(dailySeed(utc(2026, 8, 18, 0, 0, 1))).toBe(dailySeed(utc(2026, 8, 18, 23, 59, 59)));
  });

  it('rolls at UTC midnight', () => {
    expect(dailySeed(utc(2026, 8, 18, 23, 59, 59))).toBe(20260818);
    expect(dailySeed(utc(2026, 8, 19, 0, 0, 1))).toBe(20260819);
  });

  it('rolls across month and year boundaries', () => {
    expect(dailySeed(utc(2026, 8, 31, 23, 59))).toBe(20260831);
    expect(dailySeed(utc(2026, 9, 1, 0, 1))).toBe(20260901);
    expect(dailySeed(utc(2026, 12, 31, 23, 59))).toBe(20261231);
    expect(dailySeed(utc(2027, 1, 1, 0, 0, 1))).toBe(20270101);
  });
});

describe('difficulty tiers', () => {
  it('follows the approved weekday rotation (2026-08-17 was a Monday)', () => {
    expect(dayTier(utc(2026, 8, 17))).toEqual({ tier: 'easy', iceCount: 0 }); // Mon
    expect(dayTier(utc(2026, 8, 18))).toEqual({ tier: 'medium', iceCount: 1 }); // Tue
    expect(dayTier(utc(2026, 8, 19))).toEqual({ tier: 'medium', iceCount: 2 }); // Wed
    expect(dayTier(utc(2026, 8, 20))).toEqual({ tier: 'medium', iceCount: 1 }); // Thu
    expect(dayTier(utc(2026, 8, 21))).toEqual({ tier: 'hard', iceCount: 3 }); // Fri
    expect(dayTier(utc(2026, 8, 22))).toEqual({ tier: 'medium', iceCount: 2 }); // Sat
    expect(dayTier(utc(2026, 8, 23))).toEqual({ tier: 'easy', iceCount: 0 }); // Sun
    expect(TIER_BY_WEEKDAY).toHaveLength(7);
  });

  it('builds daily deal options with the 3-undo budget', () => {
    expect(dailyDealOptions(utc(2026, 8, 21))).toEqual({ iceCount: 3, undoLimit: 3 });
    expect(DAILY_UNDO_LIMIT).toBe(3);
  });
});

describe('two devices, same date → identical board', () => {
  it('produces byte-identical deals from the date-derived seed and tier', () => {
    const deviceA = utc(2026, 8, 21, 6, 12); // morning in one timezone
    const deviceB = utc(2026, 8, 21, 22, 47); // evening in another — same UTC day
    const dealA = deal(dailySeed(deviceA), dailyDealOptions(deviceA));
    const dealB = deal(dailySeed(deviceB), dailyDealOptions(deviceB));
    expect(JSON.stringify(dealA)).toBe(JSON.stringify(dealB));
  });
});

describe('dayIndex', () => {
  it('is 1 on the launch date and counts up per UTC day', () => {
    expect(dayIndex(utc(2026, 9, 1), '2026-09-01')).toBe(1);
    expect(dayIndex(utc(2026, 9, 1, 23, 59, 59), '2026-09-01')).toBe(1);
    expect(dayIndex(utc(2026, 9, 2), '2026-09-01')).toBe(2);
    expect(dayIndex(utc(2026, 9, 12), '2026-09-01')).toBe(12);
  });

  it('yields ≤ 0 before launch', () => {
    expect(dayIndex(utc(2026, 8, 31), '2026-09-01')).toBe(0);
    expect(dayIndex(utc(2026, 8, 30), '2026-09-01')).toBe(-1);
  });
});

describe('countdown', () => {
  it('measures time to next UTC midnight', () => {
    expect(msUntilNextUtcDay(utc(2026, 8, 18, 23, 0))).toBe(3_600_000);
    expect(msUntilNextUtcDay(utc(2026, 8, 18, 0, 0, 1))).toBe(86_400_000 - 1000);
  });

  it('formats HH:MM, floored, never negative', () => {
    expect(formatCountdown(3_600_000)).toBe('01:00');
    expect(formatCountdown(3_599_000)).toBe('00:59');
    expect(formatCountdown(86_340_000)).toBe('23:59');
    expect(formatCountdown(59_000)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
