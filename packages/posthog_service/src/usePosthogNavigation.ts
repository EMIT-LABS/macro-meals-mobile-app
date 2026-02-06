import type { NavigationState } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { usePosthog } from './usePosthog';

/**
 * Helper function to get the active route name from navigation state
 */
const getActiveRouteName = (state: NavigationState | undefined): string | undefined => {
    if (!state) return undefined;
    
    const route = state.routes[state.index];
    
    // If the route has nested state, recursively get the active route
    if (route.state) {
        return getActiveRouteName(route.state as NavigationState);
    }
    
    return route.name;
};

/**
 * Hook to track navigation changes with PostHog
 * This should be used inside a component that's within PosthogProvider
 * and will set up navigation tracking on the provided navigationRef
 * 
 * Usage:
 * ```tsx
 * const navigationRef = useRef();
 * usePosthogNavigation(navigationRef);
 * 
 * <NavigationContainer ref={navigationRef}>
 *   ...
 * </NavigationContainer>
 * ```
 */
export const usePosthogNavigation = (navigationRef: React.RefObject<any>) => {
    const posthog = usePosthog();
    const routeNameRef = useRef<string>();

    useEffect(() => {
        if (!navigationRef.current) return;

        // Set up handlers that can be called from NavigationContainer callbacks
        const handleStateChange = (state: NavigationState | undefined) => {
            const currentRouteName = getActiveRouteName(state);
            const previousRouteName = routeNameRef.current;

            if (currentRouteName && currentRouteName !== previousRouteName) {
                console.log('[POSTHOG] 📱 Screen view:', currentRouteName);

                // Track the screen view
                posthog.track({
                    name: '$screen',
                    properties: {
                        $screen_name: currentRouteName,
                        $previous_screen_name: previousRouteName,
                    },
                });

                // Update the ref
                routeNameRef.current = currentRouteName;
            }
        };

        const handleReady = () => {
            const state = navigationRef.current?.getRootState();
            const initialRouteName = getActiveRouteName(state);
            
            if (initialRouteName && !routeNameRef.current) {
                console.log('[POSTHOG] 📱 Initial screen view:', initialRouteName);
                posthog.track({
                    name: '$screen',
                    properties: {
                        $screen_name: initialRouteName,
                    },
                });
                routeNameRef.current = initialRouteName;
            }
        };

        // Store handlers on navigationRef so they can be accessed in callbacks
        (navigationRef.current as any)._posthogHandlers = {
            handleStateChange,
            handleReady,
        };

        console.log('[POSTHOG] ✅ Navigation tracking set up');
    }, [posthog, navigationRef]);
};
