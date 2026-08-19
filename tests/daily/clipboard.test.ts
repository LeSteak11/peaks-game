// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, shareOrCopy } from '../../src/daily/share';

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

function stubShare(share: ((data: unknown) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
}

function stubPointer(coarse: boolean): void {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  stubClipboard(() => Promise.reject(new Error('unstubbed')));
  stubShare(undefined);
});

describe('copyText', () => {
  it('uses the async clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    expect(await copyText('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('reports failure when both clipboard paths are unavailable', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    // jsdom's execCommand throws "not implemented" → the fallback also fails.
    expect(await copyText('hello')).toBe(false);
  });
});

describe('shareOrCopy', () => {
  it('prefers the Web Share API on coarse-pointer devices', async () => {
    stubPointer(true);
    const share = vi.fn().mockResolvedValue(undefined);
    stubShare(share);
    expect(await shareOrCopy('text')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'text' });
  });

  it('falls back to clipboard when the user cancels the share sheet', async () => {
    stubPointer(true);
    stubShare(vi.fn().mockRejectedValue(new Error('AbortError')));
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    expect(await shareOrCopy('text')).toBe('copied');
  });

  it('goes straight to clipboard on fine-pointer devices even if share exists', async () => {
    stubPointer(false);
    const share = vi.fn().mockResolvedValue(undefined);
    stubShare(share);
    stubClipboard(vi.fn().mockResolvedValue(undefined));
    expect(await shareOrCopy('text')).toBe('copied');
    expect(share).not.toHaveBeenCalled();
  });

  it('reports failed when nothing works', async () => {
    stubPointer(false);
    stubShare(undefined);
    stubClipboard(() => Promise.reject(new Error('denied')));
    expect(await shareOrCopy('text')).toBe('failed');
  });
});
