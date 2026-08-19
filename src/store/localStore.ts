import { DEFAULT_SETTINGS, type DailyResultRecord, type Settings, type Store } from './Store';
import { EMPTY_STREAK, type StreakState } from '../daily/streak';

/** The subset of the DOM Storage API we use — lets tests inject an in-memory fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SCHEMA_VERSION = 1;

const PREFIX = 'peaks.';
const VERSION_KEY = `${PREFIX}schemaVersion`;
const STREAK_KEY = `${PREFIX}streak`;
const SETTINGS_KEY = `${PREFIX}settings`;
const dailyKey = (dateKey: string) => `${PREFIX}daily.${dateKey}`;

/**
 * Migration hook: MIGRATIONS[n] upgrades stored data from schema n to n+1. None exist
 * yet — the versioning is wired now so a pre-Supabase schema change is a cheap,
 * ordinary migration instead of a data wipe.
 */
export const MIGRATIONS: Readonly<Record<number, (storage: StorageLike) => void>> = {};

export function runMigrations(
  storage: StorageLike,
  from: number,
  to: number,
  migrations: Readonly<Record<number, (storage: StorageLike) => void>> = MIGRATIONS,
): void {
  for (let v = from; v < to; v++) migrations[v]?.(storage);
}

export class LocalStore implements Store {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? (globalThis.localStorage as StorageLike);
    this.migrate();
  }

  private migrate(): void {
    const raw = this.storage.getItem(VERSION_KEY);
    // Missing or unreadable version → treat as a fresh install at the current schema.
    const stored = raw === null ? SCHEMA_VERSION : Number(raw);
    const from = Number.isInteger(stored) ? stored : SCHEMA_VERSION;
    if (from < SCHEMA_VERSION) runMigrations(this.storage, from, SCHEMA_VERSION);
    this.storage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
  }

  private readJson<T>(key: string): T | null {
    const raw = this.storage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null; // corrupt entry reads as absent rather than crashing the app
    }
  }

  getDailyResult(dateKey: string): DailyResultRecord | null {
    return this.readJson<DailyResultRecord>(dailyKey(dateKey));
  }

  setDailyResult(result: DailyResultRecord): void {
    this.storage.setItem(dailyKey(result.dateKey), JSON.stringify(result));
  }

  getStreak(): StreakState {
    return this.readJson<StreakState>(STREAK_KEY) ?? EMPTY_STREAK;
  }

  setStreak(streak: StreakState): void {
    this.storage.setItem(STREAK_KEY, JSON.stringify(streak));
  }

  getSettings(): Settings {
    // Merge over defaults so newly added settings keys never read as undefined.
    return { ...DEFAULT_SETTINGS, ...this.readJson<Partial<Settings>>(SETTINGS_KEY) };
  }

  setSettings(settings: Settings): void {
    this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}
