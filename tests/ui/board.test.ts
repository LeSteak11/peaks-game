// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { GameController } from '../../src/ui/controller';
import { createBoard, slotPosition } from '../../src/ui/board';
import { BOARD_SIZE, BOTTOM_ROW_START } from '../../src/engine/deal';
import { legalMoves, tapAction } from '../../src/engine/rules';

function setup(seed = 42, iceCount = 0) {
  const controller = new GameController(0); // no input lock in tests
  const board = createBoard(controller);
  controller.subscribe(board.sync);
  controller.newGame(seed, { iceCount, undoLimit: null });
  document.body.replaceChildren(board.root);
  return { controller, board };
}

describe('board rendering', () => {
  it('renders 28 slot buttons at distinct positions', () => {
    setup();
    const slots = document.querySelectorAll('.slot');
    expect(slots).toHaveLength(BOARD_SIZE);
    const positions = new Set(
      Array.from({ length: BOARD_SIZE }, (_, i) => {
        const { leftPct, topPct } = slotPosition(i);
        return `${leftPct},${topPct}`;
      }),
    );
    expect(positions.size).toBe(BOARD_SIZE);
  });

  it('marks only the bottom row face-up on a fresh deal', () => {
    setup();
    const slots = document.querySelectorAll<HTMLElement>('.slot');
    slots.forEach((el, i) => {
      expect(el.classList.contains('face-up')).toBe(i >= BOTTOM_ROW_START);
    });
  });

  it('highlights exactly the currently playable cards', () => {
    const { controller } = setup();
    const state = controller.getState();
    const slots = document.querySelectorAll<HTMLElement>('.slot');
    slots.forEach((el, i) => {
      expect(el.classList.contains('playable')).toBe(tapAction(state, i) !== null);
    });
  });

  it('clears a card on click and re-highlights for the new pile card', () => {
    const { controller } = setup();
    const tap = legalMoves(controller.getState()).find((m) => m.type === 'tap');
    if (!tap || tap.type !== 'tap') throw new Error('no tap available for seed');
    const el = document.querySelector<HTMLButtonElement>(`.slot[data-slot="${tap.slot}"]`)!;
    el.click();
    expect(controller.getState().board[tap.slot]!.cleared).toBe(true);
    expect(el.classList.contains('cleared')).toBe(true);
    expect(el.disabled).toBe(true);
  });

  it('ignores clicks on covered face-down cards', () => {
    const { controller } = setup();
    const before = controller.getState();
    document.querySelector<HTMLButtonElement>('.slot[data-slot="0"]')!.click();
    expect(controller.getState()).toBe(before);
  });

  it('shows ice overlays for iced slots, never on the bottom row', () => {
    setup(7, 3);
    const iced = document.querySelectorAll<HTMLElement>('.slot.ice-intact');
    expect(iced).toHaveLength(3);
    iced.forEach((el) => {
      expect(Number(el.dataset.slot)).toBeLessThan(BOTTOM_ROW_START);
    });
  });

  it('undo restores the pre-clear visual state', () => {
    const { controller } = setup();
    const tap = legalMoves(controller.getState()).find((m) => m.type === 'tap');
    if (!tap || tap.type !== 'tap') throw new Error('no tap available for seed');
    controller.tap(tap.slot);
    controller.undo();
    const el = document.querySelector<HTMLButtonElement>(`.slot[data-slot="${tap.slot}"]`)!;
    expect(el.classList.contains('cleared')).toBe(false);
    expect(el.disabled).toBe(false);
  });
});
