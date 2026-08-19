import type { GameState } from '../engine/types';
import { clearedCount, isStuck, isSummit } from '../engine/rules';
import { BOARD_SIZE } from '../engine/deal';
import type { GameController } from './controller';
import { cardBackSvg, cardFaceSvg, cardName } from './card';

/** Combo bar fills toward this chain length (display only — combos may exceed it). */
const COMBO_FULL = 8;

export interface HudView {
  readonly root: HTMLElement;
  sync(state: GameState): void;
}

/** Top strip: score, combo meter (fills per clear, drains on draw), progress. */
export function createHud(): HudView {
  const root = document.createElement('section');
  root.className = 'hud';
  root.innerHTML =
    `<div class="hud-score"><span class="hud-label">Score</span><span class="score-value">0</span></div>` +
    `<div class="combo" role="img" aria-label="Combo meter">` +
    `<div class="combo-track"><div class="combo-fill"></div></div>` +
    `<span class="combo-text">×0</span>` +
    `</div>` +
    `<div class="hud-progress"><span class="hud-label">Cleared</span><span class="progress-value">0/28</span></div>`;

  const scoreEl = root.querySelector<HTMLElement>('.score-value')!;
  const fillEl = root.querySelector<HTMLElement>('.combo-fill')!;
  const comboTextEl = root.querySelector<HTMLElement>('.combo-text')!;
  const progressEl = root.querySelector<HTMLElement>('.progress-value')!;

  let lastCombo = 0;

  function sync(state: GameState): void {
    scoreEl.textContent = String(state.score);
    progressEl.textContent = `${clearedCount(state)}/${BOARD_SIZE}`;
    fillEl.style.width = `${Math.min(state.combo / COMBO_FULL, 1) * 100}%`;
    comboTextEl.textContent = `×${state.combo}`;
    if (state.combo > lastCombo) {
      // Retrigger the pulse animation on each increment.
      fillEl.classList.remove('pulse');
      void fillEl.offsetWidth; // force reflow so the animation restarts
      fillEl.classList.add('pulse');
    }
    lastCombo = state.combo;
  }

  return { root, sync };
}

export interface TrayView {
  readonly root: HTMLElement;
  sync(state: GameState): void;
}

/** Bottom strip: pack (with remaining count), pile (the visual anchor), undo. */
export function createTray(controller: GameController): TrayView {
  const root = document.createElement('section');
  root.className = 'tray';
  root.innerHTML =
    `<button type="button" class="pack" aria-label="Draw a card">` +
    `<span class="pack-card">${cardBackSvg()}</span>` +
    `<span class="pack-count">23</span>` +
    `</button>` +
    `<div class="pile"><span class="pile-card"></span></div>` +
    `<button type="button" class="undo-btn">Undo</button>` +
    `<p class="status" role="status"></p>`;

  const packBtn = root.querySelector<HTMLButtonElement>('.pack')!;
  const packCount = root.querySelector<HTMLElement>('.pack-count')!;
  const pileCard = root.querySelector<HTMLElement>('.pile-card')!;
  const undoBtn = root.querySelector<HTMLButtonElement>('.undo-btn')!;
  const statusEl = root.querySelector<HTMLElement>('.status')!;

  packBtn.addEventListener('click', () => controller.draw());
  undoBtn.addEventListener('click', () => controller.undo());

  function sync(state: GameState): void {
    packCount.textContent = String(state.pack.length);
    packBtn.disabled = state.pack.length === 0;
    packBtn.classList.toggle('empty', state.pack.length === 0);

    const top = state.pile[state.pile.length - 1]!;
    pileCard.innerHTML = cardFaceSvg(top);
    pileCard.setAttribute('aria-label', `Pile: ${cardName(top)}`);

    if (state.undoLimit === null) {
      undoBtn.textContent = 'Undo';
      undoBtn.disabled = state.history.length === 0;
    } else {
      const left = state.undoLimit - state.undosUsed;
      undoBtn.textContent = `Undo · ${left}`;
      undoBtn.disabled = left <= 0 || state.history.length === 0;
    }

    statusEl.textContent = isSummit(state)
      ? 'Summit! ⛰️'
      : isStuck(state)
        ? `Stuck — ${clearedCount(state)}/${BOARD_SIZE} cleared`
        : '';
  }

  return { root, sync };
}
