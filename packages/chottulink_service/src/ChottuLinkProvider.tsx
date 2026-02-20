/**
 * ChottuLinkProvider – initializes SDK, subscribes to Linking and ChottuLink events,
 * persists attribution and calls onAttribution (e.g. PostHog first_open + setUserPropertiesOnce).
 */

import React, { useEffect, useRef } from 'react';
import { Linking, NativeEventEmitter, NativeModules } from 'react-native';
import { chottulinkService } from './chottulink_service';
import type { ChottuLinkProviderProps, UTMAttribution } from './types';
import { FIRST_OPEN_ATTRIBUTION_EVENT } from './constants';

const { ChottuLinkEventEmitter } = NativeModules;

export const ChottuLinkProvider: React.FC<ChottuLinkProviderProps> = ({
  apiKey,
  onAttribution,
  onNavigateFromLink,
  storageKeyPrefix,
  debug,
  children,
}) => {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || !apiKey?.trim()) return;
    initRef.current = true;
    chottulinkService.init({
      apiKey,
      onAttribution,
      storageKeyPrefix,
      debug,
    });
  }, [apiKey, onAttribution, storageKeyPrefix, debug]);

  // Pass initial URL and URL events to the SDK
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (url) chottulinkService.handleLink(url);
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (e) => handleUrl(e.url));

    return () => {
      subscription?.remove();
    };
  }, []);

  // Listen to native ChottuLink deep link resolved event
  useEffect(() => {
    if (!ChottuLinkEventEmitter) return;
    const emitter = new NativeEventEmitter(ChottuLinkEventEmitter);
    const subResolved = emitter.addListener(
      'ChottuLinkDeepLinkResolved',
      (data: { url?: string; metadata?: Record<string, unknown> }) => {
        chottulinkService.onDeepLinkResolved(data);
        onNavigateFromLink?.(data);
      }
    );
    const subError = emitter.addListener('ChottuLinkDeepLinkError', (data: unknown) => {
      if (debug) {
        console.log('[ChottuLink] DeepLinkError:', data);
      }
    });
    return () => {
      subResolved.remove();
      subError.remove();
    };
  }, [debug, onNavigateFromLink]);

  return <>{children}</>;
};

/**
 * Helper to build PostHog integration: track first_open_attribution and set UTM once on user.
 * Call this from your app when creating ChottuLinkProvider, e.g.:
 *   onAttribution={buildPostHogAttributionHandler(posthog)}
 */
export function buildPostHogAttributionHandler(posthog: {
  track: (event: { name: string; properties?: Record<string, unknown> }) => void;
  setUserPropertiesOnce?: (props: Record<string, unknown>) => void;
}): (attribution: UTMAttribution) => void {
  return (attribution: UTMAttribution) => {
    const props: Record<string, unknown> = {
      ...attribution,
      $set_once: attribution,
    };
    posthog.track({
      name: FIRST_OPEN_ATTRIBUTION_EVENT,
      properties: props,
    });
    if (posthog.setUserPropertiesOnce) {
      posthog.setUserPropertiesOnce({
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        install_attribution_link: attribution.link,
        install_is_deferred: attribution.is_deferred,
      });
    }
  };
}
