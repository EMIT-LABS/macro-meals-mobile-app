/**
 * ChottuLink service – init, handle links, get attribution, create dynamic links.
 * Uses react-native-chottulink-sdk under the hood.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDynamicLink,
  getAppLinkDataFromUrl,
  handleLink as sdkHandleLink,
  initializeChottuLink as sdkInit,
} from 'react-native-chottulink-sdk';
import type { CreateDynamicLinkConfig, UTMAttribution } from './types';
import { DEFAULT_STORAGE_PREFIX, STORAGE_KEYS } from './constants';

const PREFIX = DEFAULT_STORAGE_PREFIX;

function storageKey(key: string, prefix?: string): string {
  return `${prefix ?? PREFIX}${key}`;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** Extract UTM from SDK metadata (snake_case or camelCase); normalize for PostHog */
function buildAttributionFromMetadata(metadata: Record<string, unknown> | undefined): UTMAttribution {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const u: UTMAttribution = {};
  const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  for (const key of UTM_KEYS) {
    const v = metadata[key] ?? metadata[camel(key)];
    if (v !== undefined && v !== null && typeof v === 'string') {
      (u as Record<string, unknown>)[key] = v;
    }
  }
  if (metadata.link != null && typeof metadata.link === 'string') u.link = metadata.link;
  if (metadata.short_link != null && typeof metadata.short_link === 'string') u.short_link = metadata.short_link;
  const def = metadata.is_deferred ?? metadata.isDeferred;
  if (def !== undefined) u.is_deferred = def === true || def === 'true';
  return u;
}

class ChottuLinkService {
  private apiKey: string | null = null;
  private storagePrefix: string = PREFIX;
  private onAttributionCallback: ((attribution: UTMAttribution) => void) | null = null;
  private debug: boolean = false;

  getIsInitialized(): boolean {
    return this.apiKey != null && this.apiKey.length > 0;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Initialize the ChottuLink SDK. Call once at app startup (e.g. from ChottuLinkProvider).
   */
  init(config: {
    apiKey: string;
    onAttribution?: (attribution: UTMAttribution) => void;
    storageKeyPrefix?: string;
    debug?: boolean;
  }): void {
    const { apiKey, onAttribution, storageKeyPrefix, debug } = config;
    if (!apiKey?.trim()) {
      if (debug) {
        console.log('[ChottuLink] init skipped: no apiKey');
      }
      return;
    }
    this.apiKey = apiKey.trim();
    this.onAttributionCallback = onAttribution ?? null;
    this.storagePrefix = storageKeyPrefix ?? PREFIX;
    this.debug = debug ?? false;
    try {
      sdkInit(this.apiKey);
      if (this.debug) {
        console.log('[ChottuLink] SDK initialized');
      }
    } catch (e) {
      console.warn('[ChottuLink] initializeChottuLink error:', e);
    }
  }

  /**
   * Pass a URL to the SDK (initial URL or url event). Call from Linking.getInitialURL / Linking.addEventListener('url').
   */
  handleLink(url: string): void {
    if (!url?.trim()) return;
    try {
      sdkHandleLink(url.trim());
      if (this.debug) {
        console.log('[ChottuLink] handleLink called for:', url.substring(0, 80));
      }
    } catch (e) {
      console.warn('[ChottuLink] handleLink error:', e);
    }
  }

  /**
   * When the native SDK resolves a deep link (ChottuLinkDeepLinkResolved), call this to persist attribution and invoke onAttribution (e.g. PostHog).
   * Sends first_open_attribution only once per install (first open with link data).
   */
  async onDeepLinkResolved(data: { url?: string; metadata?: Record<string, unknown> }): Promise<void> {
    const attribution: UTMAttribution = {
      ...buildAttributionFromMetadata(data.metadata),
      link: data.url,
      is_deferred: (data.metadata?.isDeferred as boolean) ?? false,
    };
    const keySent = storageKey(STORAGE_KEYS.FIRST_OPEN_ATTRIBUTION_SENT, this.storagePrefix);
    const keyLast = storageKey(STORAGE_KEYS.LAST_ATTRIBUTION, this.storagePrefix);
    try {
      await AsyncStorage.setItem(keyLast, JSON.stringify(attribution));
      const alreadySent = await AsyncStorage.getItem(keySent);
      if (alreadySent !== 'true') {
        await AsyncStorage.setItem(keySent, 'true');
        this.onAttributionCallback?.(attribution);
        if (this.debug) {
          console.log('[ChottuLink] first_open attribution sent:', attribution);
        }
      } else {
        this.onAttributionCallback?.(attribution);
        if (this.debug) {
          console.log('[ChottuLink] attribution (subsequent) sent:', attribution);
        }
      }
    } catch (e) {
      console.warn('[ChottuLink] onDeepLinkResolved storage/callback error:', e);
    }
  }

  /**
   * Get the last stored attribution (e.g. after signup to persist UTM on the user).
   */
  async getLastAttribution(): Promise<UTMAttribution | null> {
    const key = storageKey(STORAGE_KEYS.LAST_ATTRIBUTION, this.storagePrefix);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UTMAttribution;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Get app link data from a URL (e.g. initial URL before native resolve). Use for fallback UTM from query string.
   */
  async getAppLinkDataFromUrl(url: string): Promise<Record<string, unknown> | null> {
    try {
      const data = await getAppLinkDataFromUrl(url);
      return data as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Create a dynamic link (for marketing). Returns short URL.
   */
  async createDynamicLink(config: CreateDynamicLinkConfig): Promise<{ shortURL: string }> {
    const result = await createDynamicLink({
      destinationURL: config.destinationURL,
      domain: config.domain,
      iosBehaviour: config.iosBehaviour,
      androidBehaviour: config.androidBehaviour,
      linkName: config.linkName,
      selectedPath: config.selectedPath,
      socialTitle: config.socialTitle,
      socialDescription: config.socialDescription,
      socialImageUrl: config.socialImageUrl,
      utmSource: config.utmSource,
      utmMedium: config.utmMedium,
      utmCampaign: config.utmCampaign,
      utmContent: config.utmContent,
      utmTerm: config.utmTerm,
    });
    return { shortURL: result.shortURL };
  }
}

export const chottulinkService = new ChottuLinkService();
