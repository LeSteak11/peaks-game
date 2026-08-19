import type { Move, MoveLogEntry } from '../engine/types';
import type { Tier } from '../daily/seed';
import type { StreakState } from '../daily/streak';

/**
 * Persistence boundary. The UI talks only to this interface; localStorage backs it in
 * Phase 1 and Supabase replaces the implementation in Phase 2 without touching UI code.
 */

/**
 * One finished Daily Summit. Existence of a record for today's dateKey IS the
 * once-per-day lock. `seed` + `moves` is exactly what Phase 2 leaderboard
 * validation will submit for server-side replay.
 */
export interface DailyResultRecord {
  readonly dateKey: string;
  readonly seed: number;
  readonly dayIndex: number;
  readonly tier: Tier;
  readonly iceCount: number;
  readonly won: boolean;
  /** Board cards cleared, 0–28. */
  readonly cleared: number;
  readonly score: number;
  readonly draws: number;
  readonly undosUsed: number;
  /** Full ordered move list — replayable via engine replay(seed, opts, moves). */
  readonly moves: readonly Move[];
  /** Display log (share-card emoji source): clear/draw/crack/undo. */
  readonly moveLog: readonly MoveLogEntry[];
  /** Epoch ms when the game ended. */
  readonly completedAt: number;
}

/** 'system' follows prefers-color-scheme; 'light'/'dark' are manual overrides. */
export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  readonly theme: ThemeSetting;
  /** Playable-card highlight (PM: default ON; exposed in settings UI later). */
  readonly highlightPlayable: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', highlightPlayable: true };

export interface Store {
  getDailyResult(dateKey: string): DailyResultRecord | null;
  setDailyResult(result: DailyResultRecord): void;
  getStreak(): StreakState;
  setStreak(streak: StreakState): void;
  getSettings(): Settings;
  setSettings(settings: Settings): void;
}
