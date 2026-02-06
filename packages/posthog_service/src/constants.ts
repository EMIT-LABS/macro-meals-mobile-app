/**
 * PostHog constants
 */

export const POSTHOG_HOSTS = {
    US: 'https://us.i.posthog.com',
    EU: 'https://eu.i.posthog.com',
} as const;

export const DEFAULT_HOST = POSTHOG_HOSTS.EU;
