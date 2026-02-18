/**
 * @macro-meals/chottulink-service
 * Configurable ChottuLink dynamic links & UTM attribution for React Native.
 * Use with PostHog for first_open attribution and source/medium/campaign tracking.
 */

export { ChottuLinkProvider, buildPostHogAttributionHandler } from './ChottuLinkProvider';
export { chottulinkService } from './chottulink_service';
export { useChottuLink } from './useChottuLink';
export { FIRST_OPEN_ATTRIBUTION_EVENT, STORAGE_KEYS, DEFAULT_STORAGE_PREFIX } from './constants';
export type {
  UTMAttribution,
  ChottuLinkConfig,
  ChottuLinkProviderProps,
  CreateDynamicLinkConfig,
  ChottuLinkResolvedData,
} from './types';
