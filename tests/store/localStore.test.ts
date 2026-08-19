import { describe, expect, it } from 'vitest';
import { LocalStore, SCHEMA_VERSION, runMigrations } from '../../src/store/localStore';
import { EMPTY_STREAK } from '../../src/daily/streak';
import { fakeStorage, sampleResult } from './fixtures';

describe('LocalStore', () => {
  it('round-trips a daily result, including moves and moveLog', () => {
    const store = new LocalStore(fakeStorage());
    const result = sampleResult();
    store.setDailyResult(result);
    expect(store.getDailyResult('2026-09-01')).toEqual(result);
  });

  it('returns null for unplayed days (the once-per-day lock primitive)', () => {
    const store = new LocalStore(fakeStorage());
    expect(store.getDailyResult('2026-09-01')).toBeNull();
    store.setDailyResult(sampleResult());
    expect(store.getDailyResult('2026-09-01')).not.toBeNull(); // locked
    expect(store.getDailyResult('2026-09-02')).toBeNull(); // tomorrow still open
  });

  it('keeps results for different days separate', () => {
    const store = new LocalStore(fakeStorage());
    store.setDailyResult(sampleResult({ dateKey: '2026-09-01', score: 100 }));
    store.setDailyResult(sampleResult({ dateKey: '2026-09-02', score: 200 }));
    expect(store.getDailyResult('2026-09-01')!.score).toBe(100);
    expect(store.getDailyResult('2026-09-02')!.score).toBe(200);
  });

  it('round-trips the streak and defaults to EMPTY_STREAK', () => {
    const store = new LocalStore(fakeStorage());
    expect(store.getStreak()).toEqual(EMPTY_STREAK);
    const s = { current: 7, best: 9, lastPlayedDay: '2026-09-07' };
    store.setStreak(s);
    expect(store.getStreak()).toEqual(s);
  });

  it('treats corrupt JSON as absent instead of throwing', () => {
    const storage = fakeStorage();
    storage.setItem('peaks.daily.2026-09-01', '{not json');
    storage.setItem('peaks.streak', 'also]not[json');
    const store = new LocalStore(storage);
    expect(store.getDailyResult('2026-09-01')).toBeNull();
    expect(store.getStreak()).toEqual(EMPTY_STREAK);
  });
});

describe('settings', () => {
  it('defaults to system theme with highlights on, and round-trips changes', () => {
    const store = new LocalStore(fakeStorage());
    expect(store.getSettings()).toEqual({ theme: 'system', highlightPlayable: true });
    store.setSettings({ theme: 'dark', highlightPlayable: true });
    expect(store.getSettings().theme).toBe('dark');
  });

  it('merges stored partial settings over defaults (forward-compatible)', () => {
    const storage = fakeStorage();
    storage.setItem('peaks.settings', '{"theme":"light"}'); // older schema, missing keys
    const store = new LocalStore(storage);
    expect(store.getSettings()).toEqual({ theme: 'light', highlightPlayable: true });
  });
});

describe('schema versioning', () => {
  it('stamps the current schema version on first use', () => {
    const storage = fakeStorage();
    new LocalStore(storage);
    expect(storage.getItem('peaks.schemaVersion')).toBe(String(SCHEMA_VERSION));
  });

  it('upgrades an older stored version to current', () => {
    const storage = fakeStorage();
    storage.setItem('peaks.schemaVersion', '0');
    new LocalStore(storage);
    expect(storage.getItem('peaks.schemaVersion')).toBe(String(SCHEMA_VERSION));
  });

  it('runs each migration in order exactly once (hook contract)', () => {
    const storage = fakeStorage();
    const calls: number[] = [];
    runMigrations(storage, 1, 4, {
      1: () => calls.push(1),
      2: () => calls.push(2),
      3: () => calls.push(3),
      4: () => calls.push(4), // beyond target — must not run
    });
    expect(calls).toEqual([1, 2, 3]);
  });

  it('recovers from an unreadable version value', () => {
    const storage = fakeStorage();
    storage.setItem('peaks.schemaVersion', 'garbage');
    new LocalStore(storage);
    expect(storage.getItem('peaks.schemaVersion')).toBe(String(SCHEMA_VERSION));
  });
});
