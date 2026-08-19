import type { StorageLike } from '../../src/store/localStore';
import type { DailyResultRecord } from '../../src/store/Store';

export function fakeStorage(): StorageLike & { dump(): Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => map,
  };
}

export function sampleResult(overrides: Partial<DailyResultRecord> = {}): DailyResultRecord {
  return {
    dateKey: '2026-09-01',
    seed: 20260901,
    dayIndex: 1,
    tier: 'medium',
    iceCount: 1,
    won: true,
    cleared: 28,
    score: 1340,
    draws: 9,
    undosUsed: 1,
    moves: [{ type: 'tap', slot: 20 }, { type: 'draw' }, { type: 'undo' }],
    moveLog: ['clear', 'draw', 'undo'],
    completedAt: Date.UTC(2026, 8, 1, 14, 30),
    ...overrides,
  };
}
