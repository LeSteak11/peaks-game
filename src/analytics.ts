/**
 * Analytics wrapper. Silent no-op without VITE_POSTHOG_KEY; with a key, events go to
 * PostHog (dynamically imported so keyless builds never load it). Every event carries
 * the common props (day_index, is_pwa, device) provided by initAnalytics.
 */

export type AnalyticsEvent =
  | 'app_open'
  | 'daily_start'
  | 'daily_complete'
  | 'undo'
  | 'share_click'
  | 'share_copied'
  | 'freeplay_start'
  | 'expedition_cta_click'
  | 'pwa_install_prompt'
  | 'pwa_installed';

interface Capture {
  capture(event: string, props: Record<string, unknown>): void;
}

let client: Capture | null = null;
let commonProps: () => Record<string, unknown> = () => ({});
const pending: Array<{ event: AnalyticsEvent; props: Record<string, unknown> }> = [];

/** Call once at startup. No key → everything stays a silent no-op. */
export function initAnalytics(common: () => Record<string, unknown>): void {
  commonProps = common;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host:
        (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      persistence: 'localStorage',
    });
    client = posthog;
    for (const { event, props } of pending.splice(0)) client.capture(event, props);
  });
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  const payload = { ...commonProps(), ...props };
  if (import.meta.env.DEV) console.debug('[analytics]', event, payload);
  if (client) client.capture(event, payload);
  else if (import.meta.env.VITE_POSTHOG_KEY) pending.push({ event, props: payload });
}
