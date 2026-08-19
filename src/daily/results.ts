import type { GameState, Move } from '../engine/types';
import { canUndo, clearedCount, isStuck, isSummit, replay } from '../engine/rules';
import type { DailyResultRecord, Store } from '../store/Store';
import { dailyDealOptions, dateKey, dayIndex, dayTier } from './seed';
import { recordDailyPlayed, type StreakState } from './streak';

/**
 * Daily lifecycle (PM, Step 6): stuck is a SOFT state while undos remain — the whole
 * point of the 3-undo budget. It finalizes when the player taps "Finish climb" or
 * automatically once no undo is left. Summit always finalizes.
 */
export type DailyPhase = 'playing' | 'soft-stuck' | 'final';

export function dailyPhase(state: GameState): DailyPhase {
  if (isSummit(state)) return 'final';
  if (isStuck(state)) return canUndo(state) ? 'soft-stuck' : 'final';
  return 'playing';
}

/**
 * Resume today's unfinished daily after a refresh: rebuilds the exact state —
 * undos consumed and all — from the stored (seed, moves). Stale or already-completed
 * entries are cleared and ignored.
 */
export function loadInProgress(
  store: Store,
  nowMs: number,
): { state: GameState; moves: readonly Move[] } | null {
  const progress = store.getInProgressDaily();
  if (!progress) return null;
  if (progress.dateKey !== dateKey(nowMs) || store.getDailyResult(progress.dateKey)) {
    store.clearInProgressDaily();
    return null;
  }
  try {
    return {
      state: replay(progress.seed, dailyDealOptions(nowMs), progress.moves),
      moves: progress.moves,
    };
  } catch {
    // Corrupt move list — abandon the resume rather than crash the daily.
    store.clearInProgressDaily();
    return null;
  }
}

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
  store.clearInProgressDaily();
  const streak = recordDailyPlayed(store.getStreak(), key);
  store.setStreak(streak);
  return { record, streak };
}
