import './ui/styles.css';
import { GameController } from './ui/controller';
import { createBoard } from './ui/board';
import { createHud, createTray } from './ui/hud';
import { LocalStore } from './store/localStore';
import type { ThemeSetting } from './store/Store';
import { isStuck, isSummit, legalMoves, tapAction } from './engine/rules';

// Step 4: free-play deals wired to the board. The daily flow arrives in Step 5.

const store = new LocalStore();
const controller = new GameController();

function applyTheme(theme: ThemeSetting): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

const THEME_ICON: Record<ThemeSetting, string> = { system: '◐', light: '☀️', dark: '🌙' };
const THEME_NEXT: Record<ThemeSetting, ThemeSetting> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

function newClimb(): void {
  // Free play: random seed, a bit of ice so the hazard is exercised, unlimited undo.
  controller.newGame(Math.floor(Math.random() * 2 ** 31), { iceCount: 2, undoLimit: null });
}

function setup(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  applyTheme(store.getSettings().theme);

  const header = document.createElement('header');
  header.className = 'top';
  header.innerHTML =
    `<h1>Peaks <span aria-hidden="true">⛰️</span></h1>` +
    `<button type="button" class="icon-btn new-climb" aria-label="New climb">🔀</button>` +
    `<button type="button" class="icon-btn theme-toggle" aria-label="Toggle theme"></button>`;

  const themeBtn = header.querySelector<HTMLButtonElement>('.theme-toggle')!;
  themeBtn.textContent = THEME_ICON[store.getSettings().theme];
  themeBtn.addEventListener('click', () => {
    const settings = store.getSettings();
    const theme = THEME_NEXT[settings.theme];
    store.setSettings({ ...settings, theme });
    applyTheme(theme);
    themeBtn.textContent = THEME_ICON[theme];
  });
  header.querySelector('.new-climb')!.addEventListener('click', newClimb);

  const hud = createHud();
  const board = createBoard(controller);
  const tray = createTray(controller);

  app.replaceChildren(header, hud.root, board.root, tray.root);

  let reportedEnd = false;
  controller.subscribe((state) => {
    hud.sync(state);
    board.sync(state);
    tray.sync(state);
    const stuck = isStuck(state);
    app.classList.toggle('stuck', stuck);
    if ((stuck || isSummit(state)) && !reportedEnd) {
      reportedEnd = true;
      console.debug(stuck ? '[peaks] stuck' : '[peaks] summit');
    } else if (!stuck && !isSummit(state)) {
      reportedEnd = false; // undo can re-open a finished board
    }
  });

  newClimb();

  if (import.meta.env.DEV) {
    // Dev/QA hook — drives deterministic states for screenshots and manual testing.
    (window as unknown as Record<string, unknown>).__peaks = {
      controller,
      store,
      engine: { legalMoves, tapAction, isStuck, isSummit },
    };
  }
}

setup();
