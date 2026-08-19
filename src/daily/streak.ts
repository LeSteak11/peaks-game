/**
 * Streak: +1 per consecutive UTC day with a completed Daily Summit (win or stuck both
 * count as played). A missed day resets to 0. `best` is the all-time high (shown in
 * results from Step 5).
 *
 * Streak-freeze (Base Camp, Phase ≥2) slots into recordDailyPlayed's non-consecutive
 * branch: consume a freeze to keep `current` instead of restarting at 1.
 */

export interface StreakState {
  readonly current: number;
  readonly best: number;
  /** dateKey of the last played Daily Summit, or null if never played. */
  readonly lastPlayedDay: string | null;
}

export const EMPTY_STREAK: StreakState = { current: 0, best: 0, lastPlayedDay: null };

const DAY_MS = 86_400_000;

function keyToMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

/** True when nextKey is exactly the UTC day after prevKey (month/year boundaries included). */
export function isNextUtcDay(prevKey: string, nextKey: string): boolean {
  return keyToMs(nextKey) - keyToMs(prevKey) === DAY_MS;
}

/**
 * Record that today's Daily Summit was completed (won or stuck). Idempotent per day:
 * replaying the same day never double-counts.
 */
export function recordDailyPlayed(streak: StreakState, todayKey: string): StreakState {
  if (streak.lastPlayedDay === todayKey) return streak;
  const consecutive = streak.lastPlayedDay !== null && isNextUtcDay(streak.lastPlayedDay, todayKey);
  const current = consecutive ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastPlayedDay: todayKey };
}

/**
 * The streak to display today: the stored value while it's still alive (last played
 * today or yesterday), otherwise 0 — a missed day zeroes the display even before the
 * next play writes it back.
 */
export function effectiveStreak(streak: StreakState, todayKey: string): number {
  if (streak.lastPlayedDay === null) return 0;
  if (streak.lastPlayedDay === todayKey) return streak.current;
  return isNextUtcDay(streak.lastPlayedDay, todayKey) ? streak.current : 0;
}
