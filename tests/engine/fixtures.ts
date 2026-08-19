import type { BoardSlot, Card, GameState, IceState, Rank, Suit } from '../../src/engine/types';
import { BOARD_SIZE } from '../../src/engine/deal';

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

/**
 * Hand-built states for rules tests, so ranks/exposure/ice are exactly what a test
 * needs. Ids are unique across board+pile+pack; ranks may repeat (suits differ).
 */
export function makeState(opts: {
  /** 28 ranks for slots 0..27. Default: all 5s (no accidental legal taps vs pile 9). */
  boardRanks?: number[];
  cleared?: number[];
  ice?: Record<number, IceState>;
  /** Pile ranks, last = top. Default [9]. */
  pile?: number[];
  /** Pack ranks, last = next drawn. Default []. */
  pack?: number[];
  undoLimit?: number | null;
}): GameState {
  const boardRanks = opts.boardRanks ?? Array(BOARD_SIZE).fill(5);
  if (boardRanks.length !== BOARD_SIZE) throw new Error('boardRanks must have 28 entries');
  const clearedSet = new Set(opts.cleared ?? []);
  const pileRanks = opts.pile ?? [9];
  const packRanks = opts.pack ?? [];

  let id = 0;
  const mk = (rank: number): Card => ({
    id: id++,
    rank: rank as Rank,
    suit: SUITS[id % 4]!,
  });

  const board: BoardSlot[] = boardRanks.map((rank, slot) => ({
    card: mk(rank),
    cleared: clearedSet.has(slot),
    ice: opts.ice?.[slot] ?? 'none',
  }));

  return {
    seed: 0,
    board,
    pile: pileRanks.map(mk),
    pack: packRanks.map(mk),
    combo: 0,
    score: 0,
    draws: 0,
    undoLimit: opts.undoLimit === undefined ? null : opts.undoLimit,
    undosUsed: 0,
    moveLog: [],
    history: [],
  };
}

/** Board ranks: everything 5 except the given slot overrides. */
export function ranksWith(overrides: Record<number, number>): number[] {
  const ranks = Array(BOARD_SIZE).fill(5);
  for (const [slot, rank] of Object.entries(overrides)) ranks[Number(slot)] = rank;
  return ranks;
}
