import type { Rng } from './rng';
import { shuffleInPlace } from './rng';

/**
 * Ice hazard (the one Phase 1 hazard).
 *
 * Eligible slots are rows 0–2 only (slots 0–17): the 10 bottom-row face-up cards
 * never carry ice, so the opening is never blocked (PM decision, 2026-08-18).
 * Placement is drawn from the deal's seeded RNG stream — fully deterministic.
 */
export const ICE_ELIGIBLE_SLOTS: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

export function pickIceSlots(rng: Rng, count: number): number[] {
  const capped = Math.max(0, Math.min(count, ICE_ELIGIBLE_SLOTS.length));
  if (capped === 0) return [];
  const pool = shuffleInPlace([...ICE_ELIGIBLE_SLOTS], rng);
  return pool.slice(0, capped).sort((a, b) => a - b);
}
