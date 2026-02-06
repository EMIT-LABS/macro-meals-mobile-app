import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHog, PostHogProvider as PostHogProviderLib } from 'posthog-react-native';
import React, { useMemo } from 'react';
import type { PosthogProviderProps } from './types';

export const PosthogProvider: React.FC<PosthogProviderProps> = ({ 
    apiKey,
    host: _host,
    debug,
    autocapture,
    disableGeoip,
    enableSessionReplay,
    sessionReplayConfig,
    children 
}) => {
    // Use provided values or fallback to environment variables
    const posthogApiKey = apiKey || process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    const posthogHost =  'https://eu.i.posthog.com';

    // If no API key is provided, just render children without PostHog
    if (!posthogApiKey || posthogApiKey === 'undefined') {
        console.error('[POSTHOG] ❌ ERROR: No API key provided. PostHog will not be initialized.');
        console.error('[POSTHOG] ❌ Please provide an apiKey prop or set EXPO_PUBLIC_POSTHOG_API_KEY environment variable.');
        return <>{children}</>;
    }

    // Set safe defaults for autocapture to prevent React Navigation v7 errors
    // Official PostHog solution: set autocapture to false for React Navigation v7
    // Source: https://posthog.com/docs/libraries/react-native#with-react-navigationnative-and-autocapture
    const autocaptureConfig = autocapture ?? false;

    // Create PostHog client instance manually - this is the recommended approach for session replay
    // useMemo ensures the client is only created once
    const posthogClient = useMemo(() => {
        console.log('[POSTHOG] 🔧 Creating PostHog client with config:', {
            host: posthogHost,
            debug,
            autocapture: autocaptureConfig,
            disableGeoip,
            enableSessionReplay,
            sessionReplayConfig,
        });

        const options: any = {
            host: posthogHost,
            // CRITICAL: customStorage is required for session replay to persist and work in React Native
            customStorage: AsyncStorage,
            // CRITICAL: Enable session replay
            enableSessionReplay: enableSessionReplay ?? true,
            // CRITICAL: Persist session ID across app restarts for proper session replay linking
            enablePersistSessionIdAcrossRestart: true,
        };

        if (debug !== undefined) options.debug = debug;
        if (disableGeoip !== undefined) options.disableGeoip = disableGeoip;
        if (sessionReplayConfig !== undefined) options.sessionReplayConfig = sessionReplayConfig;

        console.log('[POSTHOG] 🔍 Final options before init:', JSON.stringify({
            ...options,
            customStorage: options.customStorage ? 'AsyncStorage (present)' : 'MISSING',
            enableSessionReplay: options.enableSessionReplay,
            enablePersistSessionIdAcrossRestart: options.enablePersistSessionIdAcrossRestart,
            sessionReplayConfig: options.sessionReplayConfig,
        }, null, 2));

        // Create the PostHog client instance
        const client = new PostHog(posthogApiKey, options);
        
        console.log('[POSTHOG] ✅ PostHog client created successfully');
        
        return client;
    }, [posthogApiKey, posthogHost, debug, autocaptureConfig, disableGeoip, enableSessionReplay, sessionReplayConfig]);

    return (
        <PostHogProviderLib
            client={posthogClient}
            autocapture={autocaptureConfig as any}
        >
            {children}
        </PostHogProviderLib>
    );
};