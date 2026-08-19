// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createHint, createResultsModal } from '../../src/ui/modals';
import { sampleResult } from '../store/fixtures';

const NOON = Date.UTC(2026, 8, 1, 12); // 12:00 UTC → 12:00 to next summit

function setup(shareOutcome: 'shared' | 'copied' | 'failed' = 'copied') {
  const onShare = vi.fn().mockResolvedValue(shareOutcome);
  const onPractice = vi.fn();
  const modal = createResultsModal({ onShare, onPractice }, () => NOON);
  document.body.replaceChildren(modal.root);
  return { modal, onShare, onPractice };
}

describe('results modal', () => {
  it('renders outcome, day number, stats, current + best streak, and the countdown', () => {
    const { modal } = setup();
    modal.open(sampleResult({ score: 1340, cleared: 28, won: true, dayIndex: 12 }), {
      current: 7,
      best: 9,
      lastPlayedDay: '2026-09-01',
    });
    expect(modal.isOpen()).toBe(true);
    const text = (sel: string) => modal.root.querySelector(sel)!.textContent;
    expect(text('.results-title')).toBe('Summit! ⛰️');
    expect(text('.results-day')).toBe('Peaks #12');
    expect(text('.results-score')).toBe('1,340');
    expect(text('.results-cleared')).toBe('28/28');
    expect(text('.results-streak')).toBe('🔥 7');
    expect(text('.results-best')).toBe('9');
    expect(text('.results-countdown')).toBe('Next summit in 12:00');
  });

  it('shows the stuck variant', () => {
    const { modal } = setup();
    modal.open(sampleResult({ won: false, cleared: 24 }), {
      current: 1,
      best: 3,
      lastPlayedDay: '2026-09-01',
    });
    expect(modal.root.querySelector('.results-title')!.textContent).toBe('Stuck at 24/28');
  });

  it('keeps the Expedition CTA disabled', () => {
    const { modal } = setup();
    modal.open(sampleResult(), { current: 1, best: 1, lastPlayedDay: '2026-09-01' });
    expect(modal.root.querySelector<HTMLButtonElement>('.expedition-btn')!.disabled).toBe(true);
  });

  it('share click calls the handler and shows the "Copied!" state', async () => {
    const { modal, onShare } = setup('copied');
    const record = sampleResult();
    const streak = { current: 2, best: 2, lastPlayedDay: '2026-09-01' };
    modal.open(record, streak);
    const btn = modal.root.querySelector<HTMLButtonElement>('.share-btn')!;
    btn.click();
    expect(onShare).toHaveBeenCalledWith(record, streak);
    await vi.waitFor(() => expect(btn.textContent).toBe('Copied!'));
  });

  it('shows "Shared!" for a Web Share success', async () => {
    const { modal } = setup('shared');
    modal.open(sampleResult(), { current: 1, best: 1, lastPlayedDay: '2026-09-01' });
    const btn = modal.root.querySelector<HTMLButtonElement>('.share-btn')!;
    btn.click();
    await vi.waitFor(() => expect(btn.textContent).toBe('Shared!'));
  });

  it('practice button closes the modal and hands off', () => {
    const { modal, onPractice } = setup();
    modal.open(sampleResult(), { current: 1, best: 1, lastPlayedDay: '2026-09-01' });
    modal.root.querySelector<HTMLButtonElement>('.practice-btn')!.click();
    expect(modal.isOpen()).toBe(false);
    expect(onPractice).toHaveBeenCalledOnce();
  });
});

describe('first-time hint', () => {
  it('renders the one-liner and dismisses on ✕', () => {
    const onDismiss = vi.fn();
    const hint = createHint(onDismiss);
    document.body.replaceChildren(hint.root);
    expect(document.querySelector('.hint')!.textContent).toContain('one higher or lower');
    hint.root.querySelector<HTMLButtonElement>('.hint-close')!.click();
    expect(document.querySelector('.hint')).toBeNull();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
