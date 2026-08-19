import { deal } from '../engine/deal';
import { applyMove, canUndo, tapAction } from '../engine/rules';
import type { DealOptions, GameState, Move } from '../engine/types';

export type Listener = (state: GameState) => void;

/**
 * Thin, framework-free game controller between the pure engine and any front end.
 * Mode-agnostic: Step 4 free play and the Step 5 daily flow both drive this same API.
 *
 * Guards the engine from UI reality: illegal taps return false instead of throwing,
 * and a short input lock after each move swallows double-taps and taps landing
 * mid-animation (the classic mobile-card-game jank source).
 */
export class GameController {
  private state: GameState | null = null;
  private listeners = new Set<Listener>();
  private lockUntil = 0;

  constructor(private readonly lockMs = 150) {}

  newGame(seed: number, opts: DealOptions = {}): void {
    this.state = deal(seed, opts);
    this.lockUntil = 0;
    this.emit();
  }

  /** Resume a previously saved or derived state (Step 5 daily resume; dev tooling). */
  restore(state: GameState): void {
    this.state = state;
    this.lockUntil = 0;
    this.emit();
  }

  hasGame(): boolean {
    return this.state !== null;
  }

  getState(): GameState {
    if (!this.state) throw new Error('no game in progress — call newGame() first');
    return this.state;
  }

  /** Immediately receives the current state if a game exists. Returns unsubscribe. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    if (this.state) fn(this.state);
    return () => this.listeners.delete(fn);
  }

  tap(slot: number): boolean {
    return this.dispatch({ type: 'tap', slot });
  }

  draw(): boolean {
    return this.dispatch({ type: 'draw' });
  }

  undo(): boolean {
    return this.dispatch({ type: 'undo' });
  }

  private dispatch(move: Move): boolean {
    const state = this.state;
    if (!state) return false;
    if (Date.now() < this.lockUntil) return false; // input lock: double-tap guard
    if (move.type === 'tap' && tapAction(state, move.slot) === null) return false;
    if (move.type === 'draw' && state.pack.length === 0) return false;
    if (move.type === 'undo' && !canUndo(state)) return false;
    this.state = applyMove(state, move);
    this.lockUntil = Date.now() + this.lockMs;
    this.emit();
    return true;
  }

  private emit(): void {
    const state = this.state;
    if (!state) return;
    for (const fn of this.listeners) fn(state);
  }
}
