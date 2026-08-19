import { describe, expect, it } from 'vitest';
import {
  EMPTY_STREAK,
  effectiveStreak,
  isNextUtcDay,
  recordDailyPlayed,
  type StreakState,
} from '../../src/daily/streak';

describe('isNextUtcDay', () => {
  it('recognizes consecutive days, including month and year boundaries', () => {
    expect(isNextUtcDay('2026-08-18', '2026-08-19')).toBe(true);
    expect(isNextUtcDay('2026-08-31', '2026-09-01')).toBe(true);
    expect(isNextUtcDay('2026-12-31', '2027-01-01')).toBe(true);
    expect(isNextUtcDay('2028-02-28', '2028-02-29')).toBe(true); // leap year
    expect(isNextUtcDay('2026-08-18', '2026-08-20')).toBe(false);
    expect(isNextUtcDay('2026-08-19', '2026-08-18')).toBe(false);
    expect(isNextUtcDay('2026-08-18', '2026-08-18')).toBe(false);
  });
});

describe('recordDailyPlayed', () => {
  it('starts a streak at 1 on the first play', () => {
    const s = recordDailyPlayed(EMPTY_STREAK, '2026-09-01');
    expect(s).toEqual({ current: 1, best: 1, lastPlayedDay: '2026-09-01' });
  });

  it('increments on consecutive days and tracks best', () => {
    let s = recordDailyPlayed(EMPTY_STREAK, '2026-09-01');
    s = recordDailyPlayed(s, '2026-09-02');
    s = recordDailyPlayed(s, '2026-09-03');
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it('is idempotent for the same day (no double-count on replay/revisit)', () => {
    const once = recordDailyPlayed(EMPTY_STREAK, '2026-09-01');
    const twice = recordDailyPlayed(once, '2026-09-01');
    expect(twice).toEqual(once);
  });

  it('resets to 1 after a missed day, preserving best', () => {
    let s = recordDailyPlayed(EMPTY_STREAK, '2026-09-01');
    s = recordDailyPlayed(s, '2026-09-02'); // current 2, best 2
    s = recordDailyPlayed(s, '2026-09-04'); // missed the 3rd
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
    expect(s.lastPlayedDay).toBe('2026-09-04');
  });

  it('best only rises when current passes it', () => {
    let s: StreakState = { current: 1, best: 5, lastPlayedDay: '2026-09-01' };
    s = recordDailyPlayed(s, '2026-09-02');
    expect(s).toEqual({ current: 2, best: 5, lastPlayedDay: '2026-09-02' });
  });
});

describe('effectiveStreak (display value)', () => {
  it('shows the stored streak while alive (played today or yesterday)', () => {
    const s = { current: 4, best: 6, lastPlayedDay: '2026-09-10' };
    expect(effectiveStreak(s, '2026-09-10')).toBe(4); // today
    expect(effectiveStreak(s, '2026-09-11')).toBe(4); // yesterday — still alive
  });

  it('shows 0 once a day has been missed, and for fresh users', () => {
    const s = { current: 4, best: 6, lastPlayedDay: '2026-09-10' };
    expect(effectiveStreak(s, '2026-09-12')).toBe(0);
    expect(effectiveStreak(EMPTY_STREAK, '2026-09-12')).toBe(0);
  });
});
