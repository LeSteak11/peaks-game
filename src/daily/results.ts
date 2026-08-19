import type { GameState, Move } from '../engine/types';
import { clearedCount, isSummit } from '../engine/rules';
import type { DailyResultRecord, Store } from '../store/Store';
import { dateKey, dayIndex, dayTier } from './seed';
import { recordDailyPlayed, type StreakState } from './streak';

/**
 * Turning a finished daily game into a stored record.
 *
 * The record is keyed by the day the game STARTED (a summit finished at 00:01 UTC
 * still locks the day whose board was played, and the new day stays open), while
 * completedAt records the real finish time.
 */
export function buildDailyResult(
  state: GameState,
  moves: readonly Move[],
  startedMs: number,
  completedMs: number,
): DailyResultRecord {
  const tier = dayTier(startedMs);
  return {
    dateKey: dateKey(startedMs),
    seed: state.seed,
    dayIndex: dayIndex(startedMs),
    tier: tier.tier,
    iceCount: tier.iceCount,
    won: isSummit(state),
    cleared: clearedCount(state),
    score: state.score,
    draws: state.draws,
    undosUsed: state.undosUsed,
    moves: [...moves],
    moveLog: [...state.moveLog],
    completedAt: completedMs,
  };
}

/**
 * Persist today's finished game and advance the streak. Idempotent: if a record
 * already exists for the day, it wins and the streak is untouched.
 */
export function completeDaily(
  store: Store,
  state: GameState,
  moves: readonly Move[],
  startedMs: number,
  completedMs: number,
): { record: DailyResultRecord; streak: StreakState } {
  const key = dateKey(startedMs);
  const existing = store.getDailyResult(key);
  if (existing) return { record: existing, streak: store.getStreak() };

  const record = buildDailyResult(state, moves, startedMs, completedMs);
  store.setDailyResult(record);
  const streak = recordDailyPlayed(store.getStreak(), key);
  store.setStreak(streak);
  return { record, streak };
}
