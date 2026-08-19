import type { DailyResultRecord } from '../store/Store';
import type { StreakState } from '../daily/streak';
import { formatCountdown, msUntilNextUtcDay } from '../daily/seed';
import type { ShareOutcome } from '../daily/share';
import { BOARD_SIZE } from '../engine/deal';

export interface ResultsHandlers {
  onShare(record: DailyResultRecord, streak: StreakState): Promise<ShareOutcome>;
  onPractice(): void;
  onExpeditionClick?(): void;
}

export interface ResultsModal {
  readonly root: HTMLElement;
  open(record: DailyResultRecord, streak: StreakState): void;
  close(): void;
  isOpen(): boolean;
}

const SHARE_LABEL = 'Share ⛰️';
const OUTCOME_LABEL: Record<ShareOutcome, string> = {
  shared: 'Shared!',
  copied: 'Copied!',
  failed: 'Copy failed',
};

/** Results modal: shown on daily completion and on same-day revisits. */
export function createResultsModal(
  handlers: ResultsHandlers,
  now: () => number = Date.now,
): ResultsModal {
  const root = document.createElement('div');
  root.className = 'modal-overlay hidden';
  root.innerHTML =
    `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="results-title">` +
    `<h2 id="results-title" class="results-title"></h2>` +
    `<p class="results-day"></p>` +
    `<div class="results-stats">` +
    `<div><span class="hud-label">Score</span><span class="stat results-score"></span></div>` +
    `<div><span class="hud-label">Cleared</span><span class="stat results-cleared"></span></div>` +
    `<div><span class="hud-label">Streak</span><span class="stat results-streak"></span></div>` +
    `<div><span class="hud-label">Best</span><span class="stat results-best"></span></div>` +
    `</div>` +
    `<button type="button" class="share-btn">${SHARE_LABEL}</button>` +
    `<button type="button" class="expedition-btn" disabled>Expedition — coming soon</button>` +
    `<p class="results-countdown" role="timer"></p>` +
    `<button type="button" class="practice-btn">Practice climb</button>` +
    `</div>`;

  const titleEl = root.querySelector<HTMLElement>('.results-title')!;
  const dayEl = root.querySelector<HTMLElement>('.results-day')!;
  const scoreEl = root.querySelector<HTMLElement>('.results-score')!;
  const clearedEl = root.querySelector<HTMLElement>('.results-cleared')!;
  const streakEl = root.querySelector<HTMLElement>('.results-streak')!;
  const bestEl = root.querySelector<HTMLElement>('.results-best')!;
  const shareBtn = root.querySelector<HTMLButtonElement>('.share-btn')!;
  const countdownEl = root.querySelector<HTMLElement>('.results-countdown')!;

  let current: { record: DailyResultRecord; streak: StreakState } | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let labelTimer: ReturnType<typeof setTimeout> | null = null;

  function renderCountdown(): void {
    const ms = msUntilNextUtcDay(now());
    countdownEl.textContent =
      ms <= 1000 ? 'New summit ready — refresh!' : `Next summit in ${formatCountdown(ms)}`;
  }

  shareBtn.addEventListener('click', () => {
    if (!current || shareBtn.disabled) return;
    shareBtn.disabled = true;
    void handlers.onShare(current.record, current.streak).then((outcome) => {
      shareBtn.textContent = OUTCOME_LABEL[outcome];
      shareBtn.disabled = false;
      if (labelTimer) clearTimeout(labelTimer);
      labelTimer = setTimeout(() => (shareBtn.textContent = SHARE_LABEL), 2000);
    });
  });

  root.querySelector('.practice-btn')!.addEventListener('click', () => {
    close();
    handlers.onPractice();
  });

  root.querySelector('.expedition-btn')!.addEventListener('click', () => {
    handlers.onExpeditionClick?.(); // disabled button — never fires; kept for Phase 2
  });

  function open(record: DailyResultRecord, streak: StreakState): void {
    current = { record, streak };
    titleEl.textContent = record.won ? 'Summit! ⛰️' : `Stuck at ${record.cleared}/${BOARD_SIZE}`;
    dayEl.textContent = `Peaks #${record.dayIndex}`;
    scoreEl.textContent = record.score.toLocaleString('en-US');
    clearedEl.textContent = `${record.cleared}/${BOARD_SIZE}`;
    streakEl.textContent = `🔥 ${streak.current}`;
    bestEl.textContent = String(streak.best);
    shareBtn.textContent = SHARE_LABEL;
    renderCountdown();
    if (ticker) clearInterval(ticker);
    ticker = setInterval(renderCountdown, 15_000);
    root.classList.remove('hidden');
  }

  function close(): void {
    root.classList.add('hidden');
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  return { root, open, close, isOpen: () => !root.classList.contains('hidden') };
}

export interface HintBanner {
  readonly root: HTMLElement;
  dismiss(): void;
}

/** First-time one-line hint, dismissible; the daily flow also removes it on first move. */
export function createHint(onDismiss?: () => void): HintBanner {
  const root = document.createElement('div');
  root.className = 'hint';
  root.innerHTML =
    `<span>Tap any card <strong>one higher or lower</strong> than the pile card.</span>` +
    `<button type="button" class="hint-close" aria-label="Dismiss hint">✕</button>`;
  const dismiss = (): void => {
    root.remove();
    onDismiss?.();
  };
  root.querySelector('.hint-close')!.addEventListener('click', dismiss);
  return { root, dismiss };
}
