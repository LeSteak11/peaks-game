import { describe, expect, it } from 'vitest';
import { MOVE_LOG_LIMIT, shareText } from '../../src/daily/share';
import type { MoveLogEntry } from '../../src/engine/types';

describe('shareText', () => {
  it('reproduces the spec example byte-for-byte', () => {
    // Spec §3: Peaks #12, summit, 1,340 points, 7-day streak.
    const moveLog: MoveLogEntry[] = [
      'clear',
      'clear',
      'clear',
      'clear',
      'clear',
      'draw',
      'clear',
      'clear',
      'clear',
      'clear',
      'crack',
      'clear',
      'clear',
      'undo',
      'clear',
    ];
    expect(
      shareText({
        dayNumber: 12,
        won: true,
        cleared: 28,
        score: 1340,
        moveLog,
        streak: 7,
        siteUrl: 'https://peaks.gg',
      }),
    ).toBe(
      'Peaks #12 ⛰️ Summit! ⭐ 1,340\n' +
        '🟩🟩🟩🟩🟩🟨🟩🟩🟩🟩🟦🟩🟩⬛🟩\n' +
        '🔥 7-day streak\n' +
        'peaks.gg',
    );
  });

  it('shows cleared count instead of Summit! when stuck', () => {
    const text = shareText({
      dayNumber: 3,
      won: false,
      cleared: 24,
      score: 980,
      moveLog: ['clear'],
      streak: 1,
      siteUrl: 'https://peaks.gg',
    });
    expect(text.startsWith('Peaks #3 ⛰️ 24/28 ⭐ 980\n')).toBe(true);
    expect(text).toContain('🔥 1-day streak');
  });

  it('truncates the move log to 40 with an ellipsis', () => {
    const moveLog = Array<MoveLogEntry>(45).fill('clear');
    const line = shareText({
      dayNumber: 1,
      won: true,
      cleared: 28,
      score: 100,
      moveLog,
      streak: 1,
      siteUrl: 'https://peaks.gg',
    }).split('\n')[1]!;
    expect(line.endsWith('…')).toBe(true);
    expect([...line].filter((c) => c === '🟩')).toHaveLength(MOVE_LOG_LIMIT);
  });

  it('does not truncate at exactly 40 entries', () => {
    const moveLog = Array<MoveLogEntry>(40).fill('draw');
    const line = shareText({
      dayNumber: 1,
      won: false,
      cleared: 5,
      score: 50,
      moveLog,
      streak: 2,
      siteUrl: 'https://peaks.gg',
    }).split('\n')[1]!;
    expect(line.endsWith('…')).toBe(false);
    expect([...line].filter((c) => c === '🟨')).toHaveLength(40);
  });

  it('formats thousands and strips the URL protocol', () => {
    const text = shareText({
      dayNumber: 100,
      won: true,
      cleared: 28,
      score: 12345,
      moveLog: [],
      streak: 30,
      siteUrl: 'https://www.example.com',
    });
    expect(text).toContain('⭐ 12,345');
    expect(text.endsWith('\nwww.example.com')).toBe(true);
  });
});
