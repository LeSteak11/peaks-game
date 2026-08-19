import type { GameState } from './types';

/**
 * Scoring (Phase 1 spec §3):
 * - each clear scores CLEAR_BASE × combo, where combo is 1 for the first clear after
 *   a draw (or game start) and grows by 1 per consecutive clear; a draw resets it to 0
 * - clearing a peak top adds PEAK_BONUS; clearing all 28 adds SUMMIT_BONUS
 * - bonuses stack on top of the clear score and never affect the combo
 * - daily tiebreak: fewer draws (state.draws)
 */
export const CLEAR_BASE = 10;
export const PEAK_BONUS = 100;
export const SUMMIT_BONUS = 500;

export function score(state: GameState): number {
  return state.score;
}
