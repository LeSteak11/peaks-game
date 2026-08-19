import './ui/styles.css';
import { GameController } from './ui/controller';
import { createBoard } from './ui/board';
import { createHud, createTray } from './ui/hud';
import { createHint, createResultsModal } from './ui/modals';
import { LocalStore } from './store/localStore';
import type { ThemeSetting } from './store/Store';
import { isStuck, isSummit, legalMoves, tapAction } from './engine/rules';
import {
  dailyDealOptions,
  dailySeed,
  dateKey,
  dayIndex,
  formatCountdown,
  msUntilNextUtcDay,
} from './daily/seed';
import { completeDaily, dailyPhase, loadInProgress } from './daily/results';
import { shareOrCopy, shareText } from './daily/share';
import { initAnalytics, track } from './analytics';

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

function isPwa(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

function deviceKind(): string {
  return (window.matchMedia?.('(pointer: coarse)').matches ?? false) ? 'mobile' : 'desktop';
}

function setup(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  applyTheme(store.getSettings().theme);
  initAnalytics(() => ({
    day_index: dayIndex(Date.now()),
    is_pwa: isPwa(),
    device: deviceKind(),
  }));
  const sessionCount = store.incrementSessionCount();
  track('app_open', { session: sessionCount });

  let mode: Mode = 'daily';
  let dailyStartedMs = 0;
  let dailyFinished = false;
  let hint: ReturnType<typeof createHint> | null = null;
  let lastMoveCount = 0;

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

  // Practice banner — visible only in free play (CSS by data-mode).
  const practiceBanner = document.createElement('p');
  practiceBanner.className = 'practice-banner';
  function renderBanner(): void {
    practiceBanner.textContent = `Practice climb · Next summit in ${formatCountdown(
      msUntilNextUtcDay(Date.now()),
    )}`;
  }
  renderBanner();
  setInterval(renderBanner, 15_000);

  const hud = createHud();
  const board = createBoard(controller);
  const tray = createTray(controller, () => finalizeDaily());

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

  const main = document.createElement('main');
  main.className = 'game';
  main.append(hud.root, board.root, tray.root);
  app.replaceChildren(header, practiceBanner, main, modal.root);

  // --- PWA install: capture the prompt; surface it ONLY on the results modal ---
  let deferredInstall: (Event & { prompt(): Promise<unknown> }) | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as Event & { prompt(): Promise<unknown> };
    refreshInstallButton();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    modal.setInstall(null);
    track('pwa_installed');
  });
  function refreshInstallButton(): void {
    if (deferredInstall && store.getSessionCount() >= 2 && !isPwa()) {
      track('pwa_install_prompt');
      modal.setInstall(() => {
        void deferredInstall?.prompt();
      });
    } else {
      modal.setInstall(null);
    }
  }

  // --- modes ---
  function setMode(next: Mode): void {
    mode = next;
    app!.dataset.mode = next; // daily hides the 🔀 button via CSS — daily is one shot
  }

  function startDaily(nowMs: number): void {
    setMode('daily');
    dailyStartedMs = nowMs;
    dailyFinished = false;
    lastMoveCount = 0;

    const resumed = loadInProgress(store, nowMs);
    if (resumed) {
      controller.restore(resumed.state, resumed.moves);
      lastMoveCount = resumed.moves.length;
    } else {
      controller.newGame(dailySeed(nowMs), dailyDealOptions(nowMs));
      track('daily_start', { day_index: dayIndex(nowMs) });
      const settings = store.getSettings();
      if (!settings.seenHint) {
        hint = createHint();
        main.insertBefore(hint.root, hud.root);
        store.setSettings({ ...settings, seenHint: true });
      }
    }
  }

  function startFree(): void {
    setMode('free');
    renderBanner();
    controller.newGame(Math.floor(Math.random() * 2 ** 31), { iceCount: 2, undoLimit: null });
    track('freeplay_start');
  }

  function finalizeDaily(): void {
    if (mode !== 'daily' || dailyFinished) return;
    dailyFinished = true;
    const state = controller.getState();
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
    refreshInstallButton();
    modal.open(record, streak);
  }

  controller.subscribe((state) => {
    hud.sync(state);
    board.sync(state);
    tray.sync(state);
    app.classList.toggle('stuck', isStuck(state));

    const moves = controller.getMoves();
    if (moves.length > lastMoveCount && moves[moves.length - 1]!.type === 'undo') {
      track('undo', { mode });
    }
    lastMoveCount = moves.length;

    if (hint && state.moveLog.length > 0) {
      hint.dismiss();
      hint = null;
    }

    if (mode === 'daily' && !dailyFinished) {
      const phase = dailyPhase(state);
      if (phase === 'final') {
        if (isStuck(state)) console.debug('[peaks] stuck — no undos left, finalizing');
        finalizeDaily();
      } else {
        if (phase === 'soft-stuck') console.debug('[peaks] soft-stuck — undo or finish');
        // Persist after every move so a refresh resumes exactly here (anti-cheat).
        store.setInProgressDaily({
          dateKey: dateKey(dailyStartedMs),
          seed: state.seed,
          moves,
        });
      }
    }
  });

  // --- entry: today already played? results + countdown. Otherwise: the summit. ---
  const now = Date.now();
  const existing = store.getDailyResult(dateKey(now));
  if (existing) {
    startFree(); // quiet practice board behind the results
    refreshInstallButton();
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
