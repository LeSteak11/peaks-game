// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { GameController } from '../../src/ui/controller';
import { createHud, createTray } from '../../src/ui/hud';
import { makeState, ranksWith } from '../engine/fixtures';
import { applyMove } from '../../src/engine/rules';
import { BOARD_SIZE } from '../../src/engine/deal';

describe('HUD', () => {
  it('shows score, cleared progress, and combo state', () => {
    const hud = createHud();
    let s = makeState({ boardRanks: ranksWith({ 20: 10, 21: 11 }), pile: [9], pack: [3] });
    hud.sync(s);
    expect(hud.root.querySelector('.score-value')!.textContent).toBe('0');
    expect(hud.root.querySelector('.progress-value')!.textContent).toBe('0/28');
    expect(hud.root.querySelector('.combo-text')!.textContent).toBe('×0');

    s = applyMove(s, { type: 'tap', slot: 20 });
    s = applyMove(s, { type: 'tap', slot: 21 });
    hud.sync(s);
    expect(hud.root.querySelector('.score-value')!.textContent).toBe('30');
    expect(hud.root.querySelector('.progress-value')!.textContent).toBe('2/28');
    expect(hud.root.querySelector('.combo-text')!.textContent).toBe('×2');
    const fill = hud.root.querySelector<HTMLElement>('.combo-fill')!;
    expect(fill.style.width).toBe('25%'); // 2 of 8 toward full
    expect(fill.classList.contains('pulse')).toBe(true);

    s = applyMove(s, { type: 'draw' });
    hud.sync(s);
    expect(hud.root.querySelector('.combo-text')!.textContent).toBe('×0');
    expect(fill.style.width).toBe('0%'); // the drain
  });
});

describe('tray', () => {
  const controller = new GameController(0);

  it('shows the pack count and disables the empty pack', () => {
    const tray = createTray(controller);
    tray.sync(makeState({ pack: [4, 7] }));
    expect(tray.root.querySelector('.pack-count')!.textContent).toBe('2');
    expect(tray.root.querySelector<HTMLButtonElement>('.pack')!.disabled).toBe(false);

    tray.sync(makeState({ pack: [] }));
    expect(tray.root.querySelector('.pack-count')!.textContent).toBe('0');
    expect(tray.root.querySelector<HTMLButtonElement>('.pack')!.disabled).toBe(true);
  });

  it('renders the pile top card', () => {
    const tray = createTray(controller);
    tray.sync(makeState({ pile: [9] }));
    expect(tray.root.querySelector('.pile-card')!.getAttribute('aria-label')).toContain('9');
  });

  it('labels undo with the remaining daily budget', () => {
    const tray = createTray(controller);
    let s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], undoLimit: 3 });
    tray.sync(s);
    const btn = tray.root.querySelector<HTMLButtonElement>('.undo-btn')!;
    expect(btn.textContent).toBe('Undo · 3');
    expect(btn.disabled).toBe(true); // nothing to undo yet

    s = applyMove(s, { type: 'tap', slot: 20 });
    tray.sync(s);
    expect(btn.disabled).toBe(false);

    s = applyMove(s, { type: 'undo' });
    tray.sync(s);
    expect(btn.textContent).toBe('Undo · 2');
  });

  it('labels undo plainly in free play (unlimited)', () => {
    const tray = createTray(controller);
    tray.sync(makeState({ undoLimit: null }));
    expect(tray.root.querySelector('.undo-btn')!.textContent).toBe('Undo');
  });

  it('shows "Finish climb" only when soft-stuck in a budgeted game', () => {
    const onFinish = vi.fn();
    const tray = createTray(controller, onFinish);
    const finishBtn = tray.root.querySelector<HTMLButtonElement>('.finish-btn')!;

    // Playing normally (daily): hidden.
    let s = makeState({ boardRanks: ranksWith({ 20: 10 }), pile: [9], undoLimit: 3 });
    tray.sync(s);
    expect(finishBtn.classList.contains('hidden')).toBe(true);

    // Soft-stuck (stuck + undos remain): visible, and clicking finishes.
    s = makeState({ pile: [9], pack: [3], undoLimit: 3 });
    s = applyMove(s, { type: 'draw' }); // pack dry, nothing playable, 1 undoable move
    tray.sync(s);
    expect(finishBtn.classList.contains('hidden')).toBe(false);
    finishBtn.click();
    expect(onFinish).toHaveBeenCalledOnce();

    // Free play (unlimited undos): never shows Finish — 🔀 covers it.
    tray.sync(makeState({ pile: [9], pack: [], undoLimit: null }));
    expect(finishBtn.classList.contains('hidden')).toBe(true);
  });

  it('announces summit and stuck in the status line', () => {
    const tray = createTray(controller);
    tray.sync(makeState({})); // pack empty, no moves → stuck
    expect(tray.root.querySelector('.status')!.textContent).toContain('Stuck — 0/28');

    const all = Array.from({ length: BOARD_SIZE }, (_, i) => i);
    tray.sync(makeState({ cleared: all }));
    expect(tray.root.querySelector('.status')!.textContent).toContain('Summit');
  });
});
