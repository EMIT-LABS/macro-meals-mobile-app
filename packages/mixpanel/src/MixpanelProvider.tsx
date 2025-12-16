import { Mixpanel } from 'mixpanel-react-native';
import React, { createContext, useEffect, useState } from 'react';
import { EVENTS } from './constants';
import { MixpanelConfig, MixpanelInstance } from './types';

console.log('[DEBUG] MixpanelProvider loaded');

export const MixpanelContext = createContext<MixpanelInstance | null>(null);

export const MixpanelProvider: React.FC<{
  config: MixpanelConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const [mixpanel, setMixpanel] = useState<MixpanelInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log(
      '[MIXPANEL] 🔧 Initializing with token:',
      config.token ? `${config.token.substring(0, 10)}...` : 'undefined'
    );

    if (
      !config.token ||
      config.token === 'undefined' ||
      config.token === 'your_actual_mixpanel_token_here'
    ) {
      console.warn('[MIXPANEL] ⚠️  Invalid or missing token:', config.token);
      setIsInitialized(true);
      return;
    }

    try {
      const instance = new Mixpanel(config.token, config.debug || false);
      instance
        .init(config.trackAutomaticEvents || false)
        .then(() => {
          // Test event to verify tracking
          instance.track(EVENTS.APP_OPENED);
          setMixpanel(instance);
          setIsInitialized(true);
        })
        .catch(error => {
          console.error('[MIXPANEL] ❌ Initialization failed:', error);
          setIsInitialized(true);
        });
    } catch (error) {
      console.error('[MIXPANEL] ❌ Failed to create instance:', error);
      setIsInitialized(true);
    }

    return () => {
      // Cleanup when necessary
      if (mixpanel) {
        mixpanel.reset();
      }
    };
  }, [config.token, config.debug, config.trackAutomaticEvents]);

  console.log(
    '[DEBUG] MixpanelProvider rendered, mixpanel:',
    !!mixpanel,
    'isInitialized:',
    isInitialized
  );

  // Only render children when initialization is complete to prevent hook order issues
  if (!isInitialized) {
    return null;
  }

  return (
    <MixpanelContext.Provider value={mixpanel}>
      {children}
    </MixpanelContext.Provider>
  );
};
