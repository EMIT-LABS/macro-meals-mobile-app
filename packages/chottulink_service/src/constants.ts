/**
 * ChottuLink service storage keys and defaults
 */

export const STORAGE_KEYS = {
  FIRST_OPEN_ATTRIBUTION_SENT: 'first_open_attribution_sent',
  LAST_ATTRIBUTION: 'last_attribution',
} as const;

export const DEFAULT_STORAGE_PREFIX = 'ChottuLink_';

/** PostHog event name for first-open attribution (install → first open) */
export const FIRST_OPEN_ATTRIBUTION_EVENT = 'first_open_attribution';
