import type { GameState } from '../engine/types';
import { BOARD_SIZE, rowOf } from '../engine/deal';
import { isFaceUp, tapAction } from '../engine/rules';
import type { GameController } from './controller';
import { cardBackSvg, cardFaceSvg, cardName, crackSvg } from './card';

/**
 * Board layout in "half-card" grid units: the bottom row's 10 cards span 20 units,
 * upper rows sit centered over their coverers (matches the engine's coverage graph).
 * Positions are percentages so one layout serves 360px phones through desktop.
 */
const X_UNITS: readonly number[] = [
  3,
  9,
  15, // row 0 — peak tops
  2,
  4,
  8,
  10,
  14,
  16, // row 1
  1,
  3,
  5,
  7,
  9,
  11,
  13,
  15,
  17, // row 2
  0,
  2,
  4,
  6,
  8,
  10,
  12,
  14,
  16,
  18, // row 3 — bottom, face-up
];

/** Card width as % of board width (slightly wider than the 10% grid pitch for tap size). */
const CARD_W_PCT = 12;
/** Card height as % of board height: board = 1 + 3×0.55 card-heights tall. */
const CARD_H_PCT = 100 / 2.65;
/** Vertical pitch between rows, % of board height (55% card-height overlap). */
const ROW_Y_PCT = 0.55 * CARD_H_PCT;

export function slotPosition(slot: number): { leftPct: number; topPct: number } {
  const centerPct = (X_UNITS[slot]! + 1) * 5;
  return { leftPct: centerPct - CARD_W_PCT / 2, topPct: rowOf(slot) * ROW_Y_PCT };
}

export interface BoardView {
  readonly root: HTMLElement;
  sync(state: GameState): void;
}

export function createBoard(controller: GameController): BoardView {
  const root = document.createElement('div');
  root.className = 'board';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Mountain of cards');

  const slots: HTMLButtonElement[] = [];
  for (let slot = 0; slot < BOARD_SIZE; slot++) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'slot';
    el.dataset.slot = String(slot);
    const { leftPct, topPct } = slotPosition(slot);
    el.style.left = `${leftPct}%`;
    el.style.top = `${topPct}%`;
    el.style.zIndex = String(rowOf(slot) + 1);
    el.innerHTML =
      `<span class="card-inner">` +
      `<span class="card-face"></span>` +
      `<span class="card-back">${cardBackSvg()}</span>` +
      `</span>` +
      `<span class="ice-frost" aria-hidden="true"></span>` +
      `<span class="ice-crack" aria-hidden="true">${crackSvg()}</span>`;
    el.addEventListener('click', () => controller.tap(slot));
    slots.push(el);
    root.appendChild(el);
  }

  let renderedGame: number | null = null;

  function sync(state: GameState): void {
    // New deal (different seed object identity isn't enough — seed value works here
    // because free play always picks fresh seeds; restore() re-syncs everything anyway).
    if (renderedGame !== state.seed) {
      renderedGame = state.seed;
      for (let slot = 0; slot < BOARD_SIZE; slot++) {
        const face = slots[slot]!.querySelector<HTMLElement>('.card-face')!;
        face.innerHTML = cardFaceSvg(state.board[slot]!.card);
      }
    }
    for (let slot = 0; slot < BOARD_SIZE; slot++) {
      const el = slots[slot]!;
      const s = state.board[slot]!;
      const faceUp = isFaceUp(state, slot);
      const action = tapAction(state, slot);
      el.classList.toggle('cleared', s.cleared);
      el.classList.toggle('face-up', faceUp);
      el.classList.toggle('playable', action !== null);
      el.classList.toggle('ice-intact', !s.cleared && s.ice === 'intact');
      el.classList.toggle('ice-cracked', !s.cleared && s.ice === 'cracked');
      el.disabled = s.cleared;
      el.setAttribute(
        'aria-label',
        s.cleared ? 'cleared' : faceUp ? cardName(s.card) : 'face-down card',
      );
    }
  }

  return { root, sync };
}
