import type { BoardSlot, Card, DealOptions, GameState, Rank, Suit } from './types';
import { mulberry32, shuffleInPlace } from './rng';
import { pickIceSlots } from './hazards';
import { ranksAdjacent } from './rules';

/**
 * Board geometry — three peaks, rows of 3 / 6 / 9 / 10, 28 slots total.
 *
 * Slot indices:            row 0 (peak tops)   0..2
 *                          row 1               3..8
 *                          row 2               9..17
 *                          row 3 (face-up)    18..27
 */
export const BOARD_SIZE = 28;
export const BOTTOM_ROW_START = 18;
export const PACK_SIZE = 23;

export function rowOf(slot: number): 0 | 1 | 2 | 3 {
  if (slot < 3) return 0;
  if (slot < 9) return 1;
  if (slot < 18) return 2;
  return 3;
}

/** The (up to two) slots in the row below that must be cleared before `slot` is exposed. */
export function coverers(slot: number): readonly number[] {
  if (slot < 3) {
    // Peak top p sits on row-1 slots 2p and 2p+1.
    return [3 + 2 * slot, 4 + 2 * slot];
  }
  if (slot < 9) {
    // Row-1 slot for peak p = floor(j/2): left half sits on row-2 3p,3p+1; right on 3p+1,3p+2.
    const j = slot - 3;
    const p = Math.floor(j / 2);
    return j % 2 === 0 ? [9 + 3 * p, 10 + 3 * p] : [10 + 3 * p, 11 + 3 * p];
  }
  if (slot < 18) {
    // Row-2 slot k spans bottom-row slots k and k+1.
    const k = slot - 9;
    return [18 + k, 19 + k];
  }
  return [];
}

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (let id = 0; id < 52; id++) {
    deck.push({ id, rank: ((id % 13) + 1) as Rank, suit: SUITS[Math.floor(id / 13)]! });
  }
  return deck;
}

/** Opening guarantee: the initial pile card must match at least one bottom-row card. */
function openingHasMove(cards: readonly Card[]): boolean {
  const pile = cards[BOARD_SIZE]!;
  for (let slot = BOTTOM_ROW_START; slot < BOARD_SIZE; slot++) {
    if (ranksAdjacent(cards[slot]!.rank, pile.rank)) return true;
  }
  return false;
}

/**
 * Deterministic deal. Same (seed, opts) → byte-identical state everywhere.
 *
 * Re-deals by continuing the same RNG stream until the opening guarantee holds
 * (~19% of shuffles fail it), then draws ice placement from the same stream — so
 * the whole pipeline stays a pure function of the seed.
 */
export function deal(seed: number, opts: DealOptions = {}): GameState {
  const { iceCount = 0, undoLimit = null } = opts;
  const rng = mulberry32(seed);

  let cards: Card[];
  do {
    cards = shuffleInPlace(freshDeck(), rng);
  } while (!openingHasMove(cards));

  const iceSlots = new Set(pickIceSlots(rng, iceCount));

  const board: BoardSlot[] = [];
  for (let slot = 0; slot < BOARD_SIZE; slot++) {
    board.push({
      card: cards[slot]!,
      cleared: false,
      ice: iceSlots.has(slot) ? 'intact' : 'none',
    });
  }

  // Pack is stored draw-order-last: drawing takes the final element.
  const pack = cards.slice(BOARD_SIZE + 1).reverse();

  return {
    seed,
    board,
    pack,
    pile: [cards[BOARD_SIZE]!],
    combo: 0,
    score: 0,
    draws: 0,
    undoLimit,
    undosUsed: 0,
    moveLog: [],
    history: [],
  };
}
