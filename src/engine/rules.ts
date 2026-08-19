import type { GameState, Move, Snapshot, DealOptions } from './types';
import { BOARD_SIZE, coverers, deal, rowOf } from './deal';
import { CLEAR_BASE, PEAK_BONUS, SUMMIT_BONUS } from './scoring';

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalMoveError';
  }
}

/** Ranks match when they differ by one, with Ace↔King wrapping. Suits never matter. */
export function ranksAdjacent(a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return d === 1 || d === 12;
}

/** A slot is exposed when it isn't cleared and every slot covering it is. */
export function isExposed(state: GameState, slot: number): boolean {
  const s = state.board[slot];
  if (!s || s.cleared) return false;
  return coverers(slot).every((c) => state.board[c]!.cleared);
}

/**
 * Face-up = visible rank. The bottom row starts face-up; rows 0–2 flip exactly when
 * they become exposed (both coverers cleared). Cleared slots report false.
 */
export function isFaceUp(state: GameState, slot: number): boolean {
  const s = state.board[slot];
  if (!s || s.cleared) return false;
  return rowOf(slot) === 3 || isExposed(state, slot);
}

export function pileTop(state: GameState): number {
  return state.pile[state.pile.length - 1]!.rank;
}

/**
 * What tapping this slot would do right now:
 * - 'crack'  — exposed card with intact ice (rank irrelevant; no card moves)
 * - 'clear'  — exposed, ice none/cracked, rank ±1 of the pile card
 * - null     — not a legal tap
 */
export function tapAction(state: GameState, slot: number): 'clear' | 'crack' | null {
  if (!isExposed(state, slot)) return null;
  const s = state.board[slot]!;
  if (s.ice === 'intact') return 'crack';
  return ranksAdjacent(s.card.rank, pileTop(state)) ? 'clear' : null;
}

/**
 * All legal tap moves plus draw when the pack has cards. Undo is deliberately not
 * listed — it's a meta-move with its own budget; use canUndo.
 */
export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let slot = 0; slot < BOARD_SIZE; slot++) {
    if (tapAction(state, slot) !== null) moves.push({ type: 'tap', slot });
  }
  if (state.pack.length > 0) moves.push({ type: 'draw' });
  return moves;
}

export function canUndo(state: GameState): boolean {
  if (state.history.length === 0) return false;
  return state.undoLimit === null || state.undosUsed < state.undoLimit;
}

export function clearedCount(state: GameState): number {
  return state.board.reduce((n, s) => n + (s.cleared ? 1 : 0), 0);
}

export function isSummit(state: GameState): boolean {
  return clearedCount(state) === BOARD_SIZE;
}

/** Stuck: pack empty and no tap is legal (crack included). Undo can't change the verdict. */
export function isStuck(state: GameState): boolean {
  if (isSummit(state)) return false;
  if (state.pack.length > 0) return false;
  return legalMoves(state).length === 0;
}

function snapshot(state: GameState): Snapshot {
  const { board, pack, pile, combo, score, draws } = state;
  return { board, pack, pile, combo, score, draws };
}

export function applyMove(state: GameState, move: Move): GameState {
  switch (move.type) {
    case 'tap':
      return applyTap(state, move.slot);
    case 'draw':
      return applyDraw(state);
    case 'undo':
      return undo(state);
  }
}

function applyTap(state: GameState, slot: number): GameState {
  const action = tapAction(state, slot);
  if (action === null) {
    throw new IllegalMoveError(`illegal tap on slot ${slot}`);
  }
  const prev = snapshot(state);

  if (action === 'crack') {
    // Crack is a move in its own right: logged, undoable, combo untouched (PM decision).
    const board = state.board.map((s, i) => (i === slot ? { ...s, ice: 'cracked' as const } : s));
    return {
      ...state,
      board,
      history: [...state.history, prev],
      moveLog: [...state.moveLog, 'crack'],
    };
  }

  const board = state.board.map((s, i) => (i === slot ? { ...s, cleared: true } : s));
  const combo = state.combo + 1;
  let gained = CLEAR_BASE * combo;
  if (rowOf(slot) === 0) gained += PEAK_BONUS;
  const summitNow = board.every((s) => s.cleared);
  if (summitNow) gained += SUMMIT_BONUS;

  return {
    ...state,
    board,
    pile: [...state.pile, state.board[slot]!.card],
    combo,
    score: state.score + gained,
    history: [...state.history, prev],
    moveLog: [...state.moveLog, 'clear'],
  };
}

function applyDraw(state: GameState): GameState {
  if (state.pack.length === 0) {
    throw new IllegalMoveError('cannot draw: pack is empty');
  }
  const prev = snapshot(state);
  const drawn = state.pack[state.pack.length - 1]!;
  return {
    ...state,
    pack: state.pack.slice(0, -1),
    pile: [...state.pile, drawn],
    combo: 0,
    draws: state.draws + 1,
    history: [...state.history, prev],
    moveLog: [...state.moveLog, 'draw'],
  };
}

/**
 * Reverts the last board move (clear, crack, or draw) to its exact prior state.
 * Consumes one undo from the budget; the move log keeps growing (⬛), it never rewinds.
 */
export function undo(state: GameState): GameState {
  if (!canUndo(state)) {
    throw new IllegalMoveError(
      state.history.length === 0 ? 'nothing to undo' : 'undo limit reached',
    );
  }
  const prev = state.history[state.history.length - 1]!;
  return {
    ...state,
    ...prev,
    history: state.history.slice(0, -1),
    undosUsed: state.undosUsed + 1,
    moveLog: [...state.moveLog, 'undo'],
  };
}

/**
 * Rebuild a finished (or partial) game from its inputs. This must reproduce the
 * exact final state — the Phase 2 server-side score-validation contract.
 */
export function replay(seed: number, opts: DealOptions, moves: readonly Move[]): GameState {
  return moves.reduce(applyMove, deal(seed, opts));
}
