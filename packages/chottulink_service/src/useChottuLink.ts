/**
 * useChottuLink – hook to get last attribution and create dynamic links.
 */

import { useCallback, useState } from 'react';
import { chottulinkService } from './chottulink_service';
import type { CreateDynamicLinkConfig, UTMAttribution } from './types';

export function useChottuLink(): {
  getLastAttribution: () => Promise<UTMAttribution | null>;
  createDynamicLink: (config: CreateDynamicLinkConfig) => Promise<{ shortURL: string }>;
  isInitialized: boolean;
} {
  const [initialized] = useState(() => chottulinkService.getIsInitialized());

  const getLastAttribution = useCallback(() => {
    return chottulinkService.getLastAttribution();
  }, []);

  const createDynamicLink = useCallback((config: CreateDynamicLinkConfig) => {
    return chottulinkService.createDynamicLink(config);
  }, []);

  return {
    getLastAttribution,
    createDynamicLink,
    isInitialized: initialized,
  };
}
