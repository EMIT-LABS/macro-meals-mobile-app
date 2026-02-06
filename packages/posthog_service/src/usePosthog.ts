import { usePostHog } from 'posthog-react-native';
import { TrackEvent } from './types';

/**
 * Custom hook that wraps PostHog's usePostHog hook
 * Provides access to PostHog client for tracking events, identifying users, etc.
 */
export const usePosthog = () => {
    const posthog = usePostHog();
    if (!posthog){
        return {
            track: () => {},
            identify: () => {},
            setUserProperties: () => {},
            setUserPropertiesOnce: () => {},
            reset: () => {},
            register: () => {},
            unregister: () => {},
            flush: async () => {},
            optIn: () => {},
            optOut: () => {},
            isOptedOut: () => false,
            isFeatureEnabled: () => undefined,
            getFeatureFlag: () => undefined,
            getFeatureFlagPayload: () => undefined,
            reloadFeatureFlags: () => {},
            reloadFeatureFlagsAsync: async () => [],
            onFeatureFlags: () => () => {},
            setPersonPropertiesForFlags: () => {},
            resetPersonPropertiesForFlags: () => {},
            isInitialized: false,
        };
    }
    
    return {
        // track events
        track: (event: TrackEvent) => {
            try{
                console.log('[POSTHOG] 📊 Tracking event:', event.name, event.properties);
                
                // Verify session ID is being attached
                const sessionId = (posthog as any).getSessionId?.();
                if (sessionId) {
                    console.log('[POSTHOG] ✅ Session ID:', sessionId);
                } else {
                    console.warn('[POSTHOG] ⚠️ No session ID found!');
                }
                
                posthog.capture(event.name, event.properties);
                console.log('[POSTHOG] ✅ Event sent successfully');
            } catch (error) {
                console.error('[POSTHOG] ❌ Error tracking event:', error);
            }

        },

        // identify user
        identify: (distinctId: string, properties?: Record<string, any>) => {
            try{
                console.log('[POSTHOG] 👤 Identifying user:', distinctId);
                posthog.identify(distinctId, properties);
            } catch (error) {
                console.error('[POSTHOG] ❌ Error identifying user:', error);
            }
        },

        // set user properties (always updates)
        setUserProperties: (properties: Record<string, any>) => {
            try{
                console.log('[POSTHOG] 📝 Setting user properties ($set):', properties);
                posthog.capture('$set', { $set: properties });
            } catch (error) {
                console.error('[POSTHOG] ❌ Error setting user properties:', error);
            }
        },

        // set user properties once (only if not already set)
        setUserPropertiesOnce: (properties: Record<string, any>) => {
            try{
                console.log('[POSTHOG] 📝 Setting user properties once ($set_once):', properties);
                posthog.capture('$set_once', { $set_once: properties });
            } catch (error) {
                console.error('[POSTHOG] ❌ Error setting user properties once:', error);
            }
        },

        // reset
        reset: () => {
            try{
                console.log('[POSTHOG] 🔄 Resetting');
                posthog.reset();
            } catch (error) {
                console.error('[POSTHOG] ❌ Error resetting:', error);
            }
        },

        // register super properties
        register: (properties?: Record<string, any>) => {
            try{
                console.log('[POSTHOG] 🔧 Registering super properties:', properties);
                posthog.register(properties || {});
                console.log('[POSTHOG] ✅ Super properties registered successfully');
            } catch (error) {
                console.error('[POSTHOG] ❌ Error registering super properties:', error);
            }
        },

        // unregister super property
        unregister: (property: string) => {
            try{
                console.log('[POSTHOG] 🗑️ Unregistering super property:', property);
                posthog.unregister(property);
            } catch (error) {
                console.error('[POSTHOG] ❌ Error unregistering super property:', error);
            }
        },

        // flush events queue
        flush: async () => {
            try{
                console.log('[POSTHOG] 🚀 Flushing events queue');
                await posthog.flush();
                console.log('[POSTHOG] ✅ Events flushed successfully');
            } catch (error) {
                console.error('[POSTHOG] ❌ Error flushing events:', error);
            }
        },

        // opt in to data capture
        optIn: () => {
            try{
                console.log('[POSTHOG] ✅ User opted in to data capture');
                posthog.optIn();
            } catch (error) {
                console.error('[POSTHOG] ❌ Error opting in:', error);
            }
        },

        // opt out of data capture
        optOut: () => {
            try{
                console.log('[POSTHOG] 🚫 User opted out of data capture');
                posthog.optOut();
            } catch (error) {
                console.error('[POSTHOG] ❌ Error opting out:', error);
            }
        },

        // check if user has opted out
        isOptedOut: () => {
            try{
                return posthog.optedOut;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error checking opt out status:', error);
                return false;
            }
        },

        // Feature Flags
        // check if feature flag is enabled (boolean flags)
        isFeatureEnabled: (flagKey: string) => {
            try{
                const isEnabled = posthog.isFeatureEnabled(flagKey);
                console.log('[POSTHOG] 🚩 Feature flag check:', flagKey, '=', isEnabled);
                return isEnabled;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error checking feature flag:', error);
                return undefined;
            }
        },

        // get feature flag value (for multivariate flags)
        getFeatureFlag: (flagKey: string) => {
            try{
                const flagValue = posthog.getFeatureFlag(flagKey);
                console.log('[POSTHOG] 🚩 Feature flag value:', flagKey, '=', flagValue);
                return flagValue;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error getting feature flag:', error);
                return undefined;
            }
        },

        // get feature flag payload
        getFeatureFlagPayload: (flagKey: string) => {
            try{
                const payload = posthog.getFeatureFlagPayload(flagKey);
                console.log('[POSTHOG] 🚩 Feature flag payload:', flagKey, '=', payload);
                return payload;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error getting feature flag payload:', error);
                return undefined;
            }
        },

        // reload feature flags
        reloadFeatureFlags: () => {
            try{
                console.log('[POSTHOG] 🔄 Reloading feature flags');
                posthog.reloadFeatureFlags();
            } catch (error) {
                console.error('[POSTHOG] ❌ Error reloading feature flags:', error);
            }
        },

        // reload feature flags async (returns the flags)
        reloadFeatureFlagsAsync: async () => {
            try{
                console.log('[POSTHOG] 🔄 Reloading feature flags (async)');
                const flags = await posthog.reloadFeatureFlagsAsync();
                console.log('[POSTHOG] ✅ Feature flags reloaded:', flags);
                return flags;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error reloading feature flags:', error);
                return [];
            }
        },

        // register callback for when feature flags are loaded
        onFeatureFlags: (callback: (flags: Record<string, string | boolean>) => void) => {
            try{
                console.log('[POSTHOG] 📡 Registering feature flags callback');
                posthog.onFeatureFlags(callback);
            } catch (error) {
                console.error('[POSTHOG] ❌ Error registering feature flags callback:', error);
            }
        },

        // set person properties for feature flag evaluation
        setPersonPropertiesForFlags: (properties: Record<string, any>, reloadFlags: boolean = true) => {
            try{
                console.log('[POSTHOG] 🎯 Setting person properties for flags:', properties);
                posthog.setPersonPropertiesForFlags(properties, reloadFlags);
            } catch (error) {
                console.error('[POSTHOG] ❌ Error setting person properties for flags:', error);
            }
        },

        // reset person properties for feature flag evaluation
        resetPersonPropertiesForFlags: () => {
            try{
                console.log('[POSTHOG] 🔄 Resetting person properties for flags');
                posthog.resetPersonPropertiesForFlags();
            } catch (error) {
                console.error('[POSTHOG] ❌ Error resetting person properties for flags:', error);
            }
        },

        isInitialized: true,
    };
};

// Re-export PostHog hooks from posthog-react-native for convenience
export { useFeatureFlag, usePostHog } from 'posthog-react-native';

