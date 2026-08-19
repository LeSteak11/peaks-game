/**
 * Analytics wrapper. No-op until Step 6 wires PostHog behind VITE_POSTHOG_KEY —
 * call sites are final now so Step 6 only adds the transport. Every event will
 * carry day_index / is_pwa / device (added centrally in Step 6).
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

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props);
  }
}
