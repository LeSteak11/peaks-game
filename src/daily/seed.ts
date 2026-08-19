import type { DealOptions } from '../engine/types';

/**
 * Daily Summit scheduling: everything derives from the UTC date, so every device on
 * Earth gets the same board with no server. All functions take an epoch-ms timestamp
 * so tests can pin exact instants.
 */

export type Tier = 'easy' | 'medium' | 'hard';

export interface DayTier {
  readonly tier: Tier;
  readonly iceCount: number;
}

export const DAILY_UNDO_LIMIT = 3;

/**
 * Difficulty rotation, indexed by JS UTC weekday (0 = Sunday … 6 = Saturday).
 * PM decision 2026-08-18: Mon/Sun easy (0 ice), Tue/Thu medium (1), Wed/Sat medium (2),
 * Fri hard (3).
 */
export const TIER_BY_WEEKDAY: readonly DayTier[] = [
  { tier: 'easy', iceCount: 0 }, // Sun
  { tier: 'easy', iceCount: 0 }, // Mon
  { tier: 'medium', iceCount: 1 }, // Tue
  { tier: 'medium', iceCount: 2 }, // Wed
  { tier: 'medium', iceCount: 1 }, // Thu
  { tier: 'hard', iceCount: 3 }, // Fri
  { tier: 'medium', iceCount: 2 }, // Sat
];

const DAY_MS = 86_400_000;

/**
 * Day #1 of the Daily Summit. Placeholder until launch — the day index will be
 * re-anchored to the real launch date before going public.
 */
export const LAUNCH_DATE_ISO: string =
  (import.meta.env?.VITE_LAUNCH_DATE as string | undefined) || '2026-09-01';

/** Canonical per-day key, e.g. '2026-08-18' (UTC). Used for storage and streaks. */
export function dateKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Seed = the UTC date as the integer YYYYMMDD, fed to mulberry32 by the deal. */
export function dailySeed(ms: number): number {
  const d = new Date(ms);
  return d.getUTCFullYear() * 10_000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function dayTier(ms: number): DayTier {
  return TIER_BY_WEEKDAY[new Date(ms).getUTCDay()]!;
}

/** Options for today's Daily Summit deal: tier ice count + the 3-undo budget. */
export function dailyDealOptions(ms: number): DealOptions {
  return { iceCount: dayTier(ms).iceCount, undoLimit: DAILY_UNDO_LIMIT };
}

function utcMidnight(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** 1-based day number: launch date = day 1. Pre-launch dates yield ≤ 0. */
export function dayIndex(ms: number, launchIso: string = LAUNCH_DATE_ISO): number {
  const launch = Date.parse(`${launchIso}T00:00:00Z`);
  return Math.floor((utcMidnight(ms) - launch) / DAY_MS) + 1;
}

/** Countdown to the next Daily Summit (next UTC midnight). */
export function msUntilNextUtcDay(ms: number): number {
  return utcMidnight(ms) + DAY_MS - ms;
}

/** 'HH:MM', floored — e.g. 3 599 000 ms → '00:59'. */
export function formatCountdown(msRemaining: number): string {
  const totalMinutes = Math.floor(Math.max(0, msRemaining) / 60_000);
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}
