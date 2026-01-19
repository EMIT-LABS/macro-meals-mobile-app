import { PostHogProvider as PostHogProviderLib } from 'posthog-react-native';
import React from 'react';
import type { PosthogProviderProps } from './types';

export const PosthogProvider: React.FC<PosthogProviderProps> = ({ 
    apiKey,
    host,
    debug,
    disableGeoip,
    enableSessionReplay,
    sessionReplayConfig,
    children 
}) => {
    // Use provided values or fallback to environment variables
    const posthogApiKey = apiKey || process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    const posthogHost = host || process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    // If no API key is provided, just render children without PostHog
    if (!posthogApiKey || posthogApiKey === 'undefined') {
        console.warn('[POSTHOG] ⚠️  No API key provided. PostHog will not be initialized.');
        return <>{children}</>;
    }

    console.log('[POSTHOG] 🔧 Initializing with config:', {
        host: posthogHost,
        debug,
        disableGeoip,
        enableSessionReplay,
        sessionReplayConfig
    });

    // Build options object, only including defined values
    const options: any = {
        host: posthogHost,
    };

    if (debug !== undefined) options.debug = debug;
    if (disableGeoip !== undefined) options.disableGeoip = disableGeoip;
    if (enableSessionReplay !== undefined) options.enableSessionReplay = enableSessionReplay;
    if (sessionReplayConfig !== undefined) options.sessionReplayConfig = sessionReplayConfig;

    return (
        <PostHogProviderLib
            apiKey={posthogApiKey}
            options={options}
        >
            {children}
        </PostHogProviderLib>
    );
};