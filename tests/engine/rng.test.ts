import { describe, expect, it } from 'vitest';
import { mulberry32, nextInt, shuffleInPlace } from '../../src/engine/rng';

describe('mulberry32', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = mulberry32(20260818);
    const b = mulberry32(20260818);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, a);
    const seqB = Array.from({ length: 10 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt stays within [0, max)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = nextInt(rng, 13);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(13);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffleInPlace is deterministic per seed and keeps all elements', () => {
    const base = Array.from({ length: 52 }, (_, i) => i);
    const s1 = shuffleInPlace([...base], mulberry32(99));
    const s2 = shuffleInPlace([...base], mulberry32(99));
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(base);
    expect(s1).not.toEqual(base); // astronomically unlikely to be identity
  });
});
