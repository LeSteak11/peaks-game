/**
 * Core engine types. The engine is pure and UI-free: every function takes a state and
 * returns a new state. A full game is replayable from (seed, opts, moveList) — that is
 * the contract Phase 2 server-side validation will rely on.
 */

export type Suit = 'S' | 'H' | 'D' | 'C';

/** 1 = Ace … 13 = King. Ace and King are rank-adjacent (wrap). */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  /** 0–51, stable identity within a deal. */
  readonly id: number;
  readonly rank: Rank;
  readonly suit: Suit;
}

/**
 * Ice hazard state for a board slot.
 * - 'none'    — ordinary card
 * - 'intact'  — frost overlay; first tap cracks it (a logged move, no card moves)
 * - 'cracked' — second tap clears it like a normal card
 */
export type IceState = 'none' | 'intact' | 'cracked';

export interface BoardSlot {
  readonly card: Card;
  readonly cleared: boolean;
  readonly ice: IceState;
}

/** Move-log entries map 1:1 to share-card emoji: clear 🟩, draw 🟨, crack 🟦, undo ⬛. */
export type MoveLogEntry = 'clear' | 'draw' | 'crack' | 'undo';

export type Move = { type: 'tap'; slot: number } | { type: 'draw' } | { type: 'undo' };

/** Everything undo must restore. moveLog/undosUsed live outside — undo appends, never erases. */
export interface Snapshot {
  readonly board: readonly BoardSlot[];
  readonly pack: readonly Card[];
  readonly pile: readonly Card[];
  readonly combo: number;
  readonly score: number;
  readonly draws: number;
}

export interface GameState extends Snapshot {
  readonly seed: number;
  /** Undo budget: a number (Daily Summit: 3) or null for unlimited (free play). */
  readonly undoLimit: number | null;
  readonly undosUsed: number;
  readonly moveLog: readonly MoveLogEntry[];
  readonly history: readonly Snapshot[];
}

export interface DealOptions {
  /** Number of ice cards, 0–18. Placement is seeded — never on the bottom row. */
  readonly iceCount?: number;
  readonly undoLimit?: number | null;
}
