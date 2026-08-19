import type { MoveLogEntry } from '../engine/types';

/**
 * Share card (spec §3):
 *
 *   Peaks #12 ⛰️ Summit! ⭐ 1,340
 *   🟩🟩🟩🟩🟩🟨🟩🟩🟩🟩🟦🟩🟩⬛🟩
 *   🔥 7-day streak
 *   peaks.gg
 */

const EMOJI: Record<MoveLogEntry, string> = {
  clear: '🟩',
  draw: '🟨',
  crack: '🟦',
  undo: '⬛',
};

export const MOVE_LOG_LIMIT = 40;

export interface ShareData {
  readonly dayNumber: number;
  readonly won: boolean;
  readonly cleared: number;
  readonly score: number;
  readonly moveLog: readonly MoveLogEntry[];
  readonly streak: number;
  /** Defaults to VITE_SITE_URL; protocol is stripped for display. */
  readonly siteUrl?: string;
}

export function shareText(d: ShareData): string {
  const outcome = d.won ? 'Summit!' : `${d.cleared}/28`;
  const score = d.score.toLocaleString('en-US');
  const log =
    d.moveLog
      .slice(0, MOVE_LOG_LIMIT)
      .map((m) => EMOJI[m])
      .join('') + (d.moveLog.length > MOVE_LOG_LIMIT ? '…' : '');
  const rawUrl =
    d.siteUrl ?? ((import.meta.env?.VITE_SITE_URL as string | undefined) || 'https://peaks.gg');
  const site = rawUrl.replace(/^https?:\/\//, '');
  return `Peaks #${d.dayNumber} ⛰️ ${outcome} ⭐ ${score}\n${log}\n🔥 ${d.streak}-day streak\n${site}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Web Share API on touch devices when available (PM, Step 5); clipboard otherwise,
 * with a select-and-copy fallback for iOS Safari / insecure contexts.
 */
export async function shareOrCopy(text: string): Promise<ShareOutcome> {
  const coarse =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch {
      // user cancelled or share failed — fall through to copy
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API unavailable or denied — textarea fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
