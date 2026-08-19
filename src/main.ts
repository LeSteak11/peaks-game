import './ui/styles.css';
import { GameController } from './ui/controller';
import { createBoard } from './ui/board';
import { createHud, createTray } from './ui/hud';
import { createHint, createResultsModal } from './ui/modals';
import { LocalStore } from './store/localStore';
import type { ThemeSetting } from './store/Store';
import { isStuck, isSummit, legalMoves, tapAction } from './engine/rules';
import { dailyDealOptions, dailySeed, dateKey, dayIndex } from './daily/seed';
import { completeDaily } from './daily/results';
import { shareOrCopy, shareText } from './daily/share';
import { track } from './analytics';

const store = new LocalStore();
const controller = new GameController();

type Mode = 'daily' | 'free';

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

function setup(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  applyTheme(store.getSettings().theme);
  track('app_open');

  let mode: Mode = 'daily';
  let dailyStartedMs = 0;
  let dailyFinished = false;
  let hint: ReturnType<typeof createHint> | null = null;

  // --- static chrome ---
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
  header.querySelector('.new-climb')!.addEventListener('click', () => {
    if (mode === 'free') startFree();
  });

  const hud = createHud();
  const board = createBoard(controller);
  const tray = createTray(controller);

  const modal = createResultsModal({
    onShare: async (record, streak) => {
      track('share_click', { day_index: record.dayIndex });
      const outcome = await shareOrCopy(
        shareText({
          dayNumber: record.dayIndex,
          won: record.won,
          cleared: record.cleared,
          score: record.score,
          moveLog: record.moveLog,
          streak: streak.current,
        }),
      );
      if (outcome === 'copied') track('share_copied', { day_index: record.dayIndex });
      return outcome;
    },
    onPractice: () => startFree(),
    onExpeditionClick: () => track('expedition_cta_click'),
  });

  app.replaceChildren(header, hud.root, board.root, tray.root, modal.root);

  // --- modes ---
  function setMode(next: Mode): void {
    mode = next;
    app!.dataset.mode = next; // daily hides the 🔀 button via CSS — daily is one shot
  }

  function startDaily(nowMs: number): void {
    setMode('daily');
    dailyStartedMs = nowMs;
    dailyFinished = false;
    controller.newGame(dailySeed(nowMs), dailyDealOptions(nowMs));
    track('daily_start', { day_index: dayIndex(nowMs) });
    const settings = store.getSettings();
    if (!settings.seenHint) {
      hint = createHint();
      app!.insertBefore(hint.root, hud.root);
      store.setSettings({ ...settings, seenHint: true });
    }
  }

  function startFree(): void {
    setMode('free');
    controller.newGame(Math.floor(Math.random() * 2 ** 31), { iceCount: 2, undoLimit: null });
    track('freeplay_start');
  }

  controller.subscribe((state) => {
    hud.sync(state);
    board.sync(state);
    tray.sync(state);
    const stuck = isStuck(state);
    app.classList.toggle('stuck', stuck);

    if (hint && state.moveLog.length > 0) {
      hint.dismiss();
      hint = null;
    }

    if (mode === 'daily' && !dailyFinished && (isSummit(state) || stuck)) {
      dailyFinished = true;
      if (stuck) console.debug('[peaks] stuck');
      const { record, streak } = completeDaily(
        store,
        state,
        controller.getMoves(),
        dailyStartedMs,
        Date.now(),
      );
      track('daily_complete', {
        won: record.won,
        cleared: record.cleared,
        score: record.score,
        draws: record.draws,
      });
      modal.open(record, streak);
    }
  });

  // --- entry: today already played? results + countdown. Otherwise: the summit. ---
  const now = Date.now();
  const existing = store.getDailyResult(dateKey(now));
  if (existing) {
    startFree(); // quiet practice board behind the results
    modal.open(existing, store.getStreak());
  } else {
    startDaily(now);
  }

  if (import.meta.env.DEV) {
    // Dev/QA hook — drives deterministic states for screenshots and manual testing.
    (window as unknown as Record<string, unknown>).__peaks = {
      controller,
      store,
      modal,
      engine: { legalMoves, tapAction, isStuck, isSummit },
    };
  }
}

setup();
