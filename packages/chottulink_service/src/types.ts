/**
 * ChottuLink service types – UTM attribution and link config
 */

import type React from 'react';

export interface UTMAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Resolved deep link URL (destination) */
  link?: string;
  /** Whether this was a deferred link (install → first open) */
  is_deferred?: boolean;
  /** Raw short link if available */
  short_link?: string;
}

export interface ChottuLinkResolvedData {
  url: string;
  metadata?: Record<string, unknown>;
}

/** Config for creating a dynamic link (e.g. for marketing) */
export interface CreateDynamicLinkConfig {
  destinationURL: string;
  domain: string;
  iosBehaviour?: number; // 1 = browser, 2 = app
  androidBehaviour?: number; // 1 = browser, 2 = app
  linkName?: string;
  selectedPath?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImageUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface ChottuLinkConfig {
  /** ChottuLink API key (required for init) */
  apiKey: string;
  /** Optional: called when attribution is resolved (first open or link open). Use to send to PostHog. */
  onAttribution?: (attribution: UTMAttribution) => void;
  /** Optional: custom storage key prefix for persistence (default: ChottuLink_) */
  storageKeyPrefix?: string;
  /** If true, log debug messages */
  debug?: boolean;
}

export interface ChottuLinkProviderProps extends ChottuLinkConfig {
  children: React.ReactNode;
}
