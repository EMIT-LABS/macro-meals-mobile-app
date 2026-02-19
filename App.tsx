/** @jsxImportSource react */
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
// import firebase from '@react-native-firebase/app';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { macroMealsCrashlytics } from '@macro-meals/crashlytics';
import { MixpanelProvider, useMixpanel } from '@macro-meals/mixpanel';
import { pushNotifications } from '@macro-meals/push-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebase } from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { HasMacrosContext } from 'src/contexts/HasMacrosContext';
import { RootStack } from './RootStack';
import { OnboardingContext } from './src/contexts/OnboardingContext';
import useStore, { shouldSkipPaywall } from './src/store/useStore';

// import { userService } from './src/services/userService';
// import { authService } from './src/services/authService';
import {
  RemoteConfigProvider,
  useRemoteConfigContext,
} from '@macro-meals/remote-config-service';
import { Sentry, sentryService } from '@macro-meals/sentry_service';
import Config from 'react-native-config';
import {
  restart,
  useStallionUpdate,
  withStallion,
} from 'react-native-stallion';
import StallionPopUp from 'src/components/StallionPopUp';
import { IsProContext } from 'src/contexts/IsProContext';
import { debugService } from './src/services/debugService';
import revenueCatService from './src/services/revenueCatService';
import {
  SessionValidationResult,
  validateSession,
} from './src/services/sessionService';
// Polyfill crypto.getRandomValues for Hermes before any Sentry/uuid usage in release
import { PosthogProvider, usePosthog } from '@macro-meals/posthog_service/src';
// PostHog client is now created in PosthogProvider
// import PostHog from 'posthog-react-native';
import 'react-native-get-random-values';
import MapsService from './packages/maps_service/src/maps_service';
import { UpdateReminderModal } from './src/components/UpdateReminderModal';
// import * as Sentry from '@sentry/react-native';

// Sentry.init({
//   dsn: 'https://61236fee5ecebea6046a3c59c8392fb9@o4510325988917248.ingest.de.sentry.io/4510386705989712',

//   // Adds more context data to events (IP address, cookies, user, etc.)
//   // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
//   sendDefaultPii: true,

//   // Enable Logs
//   enableLogs: true,

//   // Configure Session Replay
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1,
//   integrations: [Sentry.mobileReplayIntegration()],

//   // uncomment the line below to enable Spotlight (https://spotlightjs.com)
//   // spotlight: __DEV__,
// });

console.log(
  '\n\n\n\n\n\n\nTHE ENVIRONMENT IS:',
  __DEV__ ? 'development' : 'production'
);

// Initialize Sentry via internal service (native enabled only in non-dev by default)
sentryService.init({
  dsn: (Config.SENTRY_DNS as string) || (Config as any).SENTRY_DNS || '',
  environment: __DEV__ ? 'development' : 'production',
  enableNativeInDev: false,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Component to handle Mixpanel identification for authenticated users
function MixpanelIdentifier() {
  const { isAuthenticated, userId } = useStore();
  const mixpanel = useMixpanel();
  const posthog = usePosthog();
  const appOpenedTracked = useRef(false);
  const lastIdentifiedUserId = useRef<string | null>(null);

  // Track app_opened only once on mount (not on every render!)
  useEffect(() => {
    if (!appOpenedTracked.current) {
      appOpenedTracked.current = true;

      const appOpenedProps = {
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version || '1.0.0',
        build_number:
          Platform.select({
            ios: Constants.expoConfig?.ios?.buildNumber,
            android: Constants.expoConfig?.android?.versionCode?.toString(),
          }) || '1',
      };

      mixpanel.track({
        name: 'app_opened',
        properties: appOpenedProps,
      });

      posthog.track({
        name: 'app_opened',
        properties: appOpenedProps,
      });

      if (SplashScreen) {
        posthog.track({
          name: 'splash_screen_viewed',
          properties: appOpenedProps,
        });
      }
    }
  }, [mixpanel, posthog, SplashScreen]); // Only track when analytics are initialized

  useEffect(() => {
    // Only identify if:
    // 1. User is authenticated
    // 2. We have a userId
    // 3. This userId is different from the last one we identified
    if (
      isAuthenticated &&
      userId &&
      userId !== lastIdentifiedUserId.current &&
      mixpanel
    ) {
      lastIdentifiedUserId.current = userId;

      // Identify the user in Mixpanel and PostHog
      mixpanel.identify(userId);
      posthog.identify(userId, {
        isAuthenticated: true,
      });

      // Set basic user properties
      mixpanel.setUserProperties({
        user_id: userId,
        is_authenticated: true,
      });
    }
  }, [isAuthenticated, userId]); // Removed mixpanel/posthog from deps to prevent re-identifies

  return null;
}

// Component to manually start PostHog session replay
function PosthogSessionReplayStarter() {
  const posthog = usePosthog();
  const replayStarted = useRef(false);

  useEffect(() => {
    // Manually start session replay to ensure it's recording
    if (posthog && posthog.isInitialized && !replayStarted.current) {
      replayStarted.current = true;

      console.log('[POSTHOG] 🔍 Checking session replay status...');
      console.log('[POSTHOG] 🔍 PostHog client:', {
        isInitialized: posthog.isInitialized,
        hasStartRecording:
          typeof (posthog as any).startRecording === 'function',
        hasStopRecording: typeof (posthog as any).stopRecording === 'function',
      });

      try {
        // Check if startRecording method exists
        if (typeof (posthog as any).startRecording === 'function') {
          (posthog as any).startRecording();
          console.log('[POSTHOG] ✅ Session replay started manually');

          // Verify recording status
          setTimeout(() => {
            const isRecording =
              typeof (posthog as any).isRecording === 'function'
                ? (posthog as any).isRecording()
                : 'unknown';
            console.log('[POSTHOG] 🔍 Recording status:', isRecording);
          }, 1000);
        } else {
          console.log(
            '[POSTHOG] ℹ️ Session replay auto-start enabled (no manual start method available)'
          );
        }
      } catch (error) {
        console.error('[POSTHOG] ❌ Error starting session replay:', error);
      }
    }
  }, [posthog]);

  return null;
}

// Component to handle Remote Config updates
function RemoteConfigHandler() {
  const { lastUpdate, error, isInitialized } = useRemoteConfigContext();

  useEffect(() => {
    if (lastUpdate && lastUpdate.updatedKeys.length > 0) {
      // Handle specific config updates here
      lastUpdate.updatedKeys.forEach((_key, _index) => {
        // Add your custom logic for specific keys here
        // For example:
        // if (key === 'feature_flags') {
        //     console.log('[REMOTE CONFIG] 🎛️ Feature flags updated, refreshing UI...');
        //     // Handle feature flags update
        // }
        // if (key === 'dev_mode') {
        //     console.log('[REMOTE CONFIG] 🛠️ Dev mode setting updated');
        //     // Handle dev mode update
        // }
      });
    }
  }, [lastUpdate]);

  useEffect(() => {
    if (error) {
      console.error('[REMOTE CONFIG] ❌ Error in handler:', {
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }, [error]);

  useEffect(() => {
    if (isInitialized) {
      // console.log('[REMOTE CONFIG] ✅ Service initialized successfully in handler', {
      //     timestamp: new Date().toISOString()
      // });
    }
  }, [isInitialized]);

  return null;
}

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionValidated, setIsSessionValidated] = useState(false);
  const { setAuthenticated, isAuthenticated } = useStore();

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [initialAuthScreen, setInitialAuthScreen] = useState('LoginScreen');
  const [hasMacros, setHasMacros] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [readyForDashboard, setReadyForDashboard] = useState(false);
  const { isRestartRequired } = useStallionUpdate();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpdateReminder, setShowUpdateReminder] = useState(false);

  useEffect(() => {
    if (isRestartRequired) setShowUpdateModal(true);
  }, [isRestartRequired]);
  // console.log('MIXPANEL_TOKEN', Config.MIXPANEL_TOKEN);
  // console.log('🔍 Current environment:', Config.ENVIRONMENT);
  // console.log('🎨 App icon should be:', Config.ENVIRONMENT === 'development' ? 'dev' : Config.ENVIRONMENT === 'staging' ? 'stg' : 'prod');

  useEffect(() => {
    async function initializeApp() {
      console.log('Starting app initialization...');
      const firebaseConfig = {
        appId: '1:733994435613:android:370718471c48417e6372f4',
        projectId: 'macro-meals-mobile',
        storageBucket: 'macro-meals-mobile.firebasestorage.app',
        apiKey: 'AIzaSyC4ai-iWprvfuWB52UeFb62TirjBytkI8k',
        messagingSenderId: '733994435613',
        databaseURL: 'https://macro-meals-mobile.firebaseio.com',
        authDomain: 'macro-meals-mobile.firebaseapp.com',
      };

      async function initializeFirebase() {
        try {
          // If firebase has not been initialized
          if (!firebase.apps.length) {
            await firebase.initializeApp(firebaseConfig);

            // Enable crashlytics and add initial metadata
            await firebase.crashlytics().setCrashlyticsCollectionEnabled(true);
            await firebase
              .crashlytics()
              .setAttribute(
                'environment',
                __DEV__ ? 'development' : 'production'
              );

            // Log app start
            firebase.crashlytics().log('App initialized');
            macroMealsCrashlytics.log('App initialized');

            // Test crashlytics is working (remove in production)
            if (__DEV__) {
              firebase
                .crashlytics()
                .recordError(new Error('Test error - Debug build'));
            }
          }

          // Set app attributes after initialization
          macroMealsCrashlytics.setAppAttributes({
            appVersion: Constants.expoConfig?.version || '1.0.0',
            buildNumber:
              Platform.select({
                ios: Constants.expoConfig?.ios?.buildNumber,
                android: Constants.expoConfig?.android?.versionCode?.toString(),
              }) || '1',
            environment: __DEV__ ? 'development' : 'production',
            deviceModel: Constants.deviceName || 'Unknown',
          });

          // Request notification permissions
          const permission = await pushNotifications.requestPermissions();

          if (permission) {
            // Get FCM token only after permissions are granted
            const token = await pushNotifications.getFCMToken();
            await pushNotifications.intializeMessaging();

            // Check for initial notification (app opened from notification)
            await pushNotifications.getInitialNotification();
            // console.log('FCM TOKEN:', token);

            return token;
          } else {
            return null;
          }
        } catch (error) {
          console.error('[FIREBASE] ❌ Error:', error);
          // Log the error to crashlytics
          firebase.crashlytics().recordError(new Error(error as string));
          return null;
        }
      }
      await initializeFirebase();

      // Initialize Maps Service
      async function initializeMapsService() {
        await MapsService.initialize({
          googleMapsApiKey: Config.GOOGLE_MAPS_API_KEY as string,
          enableLocationTracking: true,
          debug: __DEV__,
        });
      }
      await initializeMapsService();

      // Initialize RevenueCat
      try {
        await revenueCatService.initialize();
        console.log('✅ RevenueCat initialized successfully');

        // Check if purchases need to be synced (one-time sync for returning users)
        try {
          const hasSyncedPurchases = await AsyncStorage.getItem(
            'has_synced_purchases'
          );
          if (hasSyncedPurchases !== 'true') {
            await revenueCatService.syncPurchases();
            await AsyncStorage.setItem('has_synced_purchases', 'true');
          } else {
            console.log('✅ Purchases already synced previously');
          }
        } catch (syncError) {
          console.error('❌ Error during purchase sync check:', syncError);
          // Don't fail the app if sync fails
        }
      } catch (error) {
        console.error('❌ RevenueCat initialization failed:', error);
        // Don't fail the app if RevenueCat fails to initialize
      }

      try {
        // Check onboarding status first
        const onboardingCompleted = await AsyncStorage.getItem(
          'isOnboardingCompleted'
        );
        setIsOnboardingCompleted(onboardingCompleted === 'true');

        setHasMacros(false);
        setIsPro(false);
        setReadyForDashboard(false);

        // Load fonts
        await Font.loadAsync({
          UncutSans: require('./assets/fonts/Uncut-Sans-Regular.otf'),
          'UncutSans-Bold': require('./assets/fonts/Uncut-Sans-Bold.otf'),
          'UncutSans-Medium': require('./assets/fonts/Uncut-Sans-Medium.otf'),
          'UncutSans-Semibold': require('./assets/fonts/Uncut-Sans-Semibold.otf'),
        });

        // Debug: Log all stored values
        await debugService.logAllStoredValues();
        await debugService.checkAuthValues();

        // Enhanced session validation
        // console.log('🔍 App.tsx - Starting enhanced session validation...');
        // console.log('🔍 App.tsx - Current state before validation:', {
        //     isAuthenticated,
        //     hasMacros,
        //     isPro,
        //     readyForDashboard,
        //     isOnboardingCompleted
        // });
        const sessionValidation: SessionValidationResult =
          await validateSession();

        // console.log('🔍 App.tsx - Session validation result:', {
        //     isValid: sessionValidation.isValid,
        //     isComplete: sessionValidation.isComplete,
        //     hasUser: !!sessionValidation.user,
        //     error: sessionValidation.error
        // });

        if (sessionValidation.isValid && sessionValidation.user) {
          const profile = sessionValidation.user;
          console.log(
            '🔍 App.tsx - Valid session found, setting authenticated state:',
            {
              has_macros: profile.has_macros,
              is_pro: profile.is_pro,
              email: profile.email,
              id: profile.id,
              sessionComplete: sessionValidation.isComplete,
            }
          );

          // Set states in correct order
          setHasMacros(profile.has_macros);
          setReadyForDashboard(profile.has_macros);
          setAuthenticated(true, profile.id, profile.id);

          // Skip paywall if is_pro OR active referral (promo)
          if (shouldSkipPaywall(profile)) {
            console.log(
              '✅ App.tsx - User has pro or active referral, skipping paywall'
            );
            setIsPro(true);

            // Still set up RevenueCat for future subscription management
            try {
              await revenueCatService.setUserID(profile.id);
              console.log('✅ App.tsx - RevenueCat user ID set for pro user');
            } catch (error) {
              console.error(
                '❌ App.tsx - RevenueCat setup failed for pro user:',
                error
              );
            }
          } else {
            // If backend says not pro, check RevenueCat for active subscription
            try {
              await revenueCatService.setUserID(profile.id);
              const subscriptionStatus =
                await revenueCatService.checkSubscriptionStatus();
              setIsPro(subscriptionStatus.isPro);
              console.log(
                '🔍 App.tsx - RevenueCat subscription status:',
                subscriptionStatus.isPro
              );
            } catch (error) {
              console.error(
                '❌ App.tsx - Failed to check RevenueCat subscription:',
                error
              );
              setIsPro(false);
            }
          }

          console.log('🔍 App.tsx - Session restored successfully:', {
            hasMacros: profile.has_macros,
            isPro: profile.is_pro,
            readyForDashboard: profile.has_macros,
            isAuthenticated: true,
            sessionComplete: sessionValidation.isComplete,
          });
        } else {
          console.log('🔍 App.tsx - No valid session found:', {
            error: sessionValidation.error,
            isValid: sessionValidation.isValid,
            isComplete: sessionValidation.isComplete,
          });

          // Set unauthenticated state only if session validation fails
          setAuthenticated(false, '', '');

          // Clear any invalid stored credentials
          if (sessionValidation.error) {
            await Promise.all([
              AsyncStorage.removeItem('my_token'),
              AsyncStorage.removeItem('refresh_token'),
              AsyncStorage.removeItem('user_id'),
            ]);
          }
        }

        // Mark session validation as complete
        setIsSessionValidated(true);

        // Check for app updates after initialization
        setTimeout(() => {
          setShowUpdateReminder(true);
        }, 2000); // Check after 2 seconds to allow Remote Config to load
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
        // Add delay before hiding splash screen
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  // Add state logging
  useEffect(() => {
    console.log('🔍 App.tsx - Current app state:', {
      isAuthenticated,
      hasMacros,
      isPro,
      readyForDashboard,
      isOnboardingCompleted,
    });
  }, [
    isAuthenticated,
    hasMacros,
    isPro,
    readyForDashboard,
    isOnboardingCompleted,
  ]);

  // Add specific logging for isPro changes
  useEffect(() => {
    console.log('🔍 App.tsx - isPro state changed:', isPro);
  }, [isPro]);

  // Log state right before RootStack render
  console.log('🔍 App.tsx - Passing to RootStack:', {
    isAuthenticated,
    hasMacros,
    isPro,
    readyForDashboard,
    isOnboardingCompleted,
    isSessionValidated,
  });

  if (isLoading || !isSessionValidated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <MixpanelProvider
        config={{
          token: Config.MIXPANEL_TOKEN as string,
        }}
      >
        <RemoteConfigProvider
          defaults={{
            // Add your default remote config values here
            feature_flags: '{}',
            app_settings: '{}',
            maintenance_mode: 'false',
            welcome_message: 'Welcome to Macro Meals!',
            max_meals_per_day: '10',
            subscription_enabled: 'true',
            dev_mode: __DEV__ ? 'true' : 'false',
            // Version checking defaults (semantic versioning)
            ios_min_supported_build: '1.0.0',
            ios_latest_build: '1.0.0',
            android_min_supported_version_code: '1.0.0',
            android_latest_version_code: '1.0.0',
            update_message: 'A new version is available.',
            update_title: 'Update Available',
            update_description:
              'A new version is available with bug fixes and improvements.',
            update_url_ios: 'https://apps.apple.com/app/idXXXXXXXX',
            update_url_android:
              'https://play.google.com/store/apps/details?id=com.macromeals.app',
            app_version: Constants.expoConfig?.version || '1.0.0',
            build_number:
              Platform.select({
                ios: Constants.expoConfig?.ios?.buildNumber,
                android: Constants.expoConfig?.android?.versionCode?.toString(),
              }) || '1',
          }}
          settings={{
            minimumFetchIntervalMillis: 30000, // 30 seconds minimum fetch interval
          }}
          enableRealTimeUpdates={true}
          onConfigUpdate={(event, error) => {
            if (error) {
              console.error('[REMOTE CONFIG] Update error:', error);
            } else {
              // Check for version updates when config changes
              if (
                event.updatedKeys.some(
                  key =>
                    key.includes('ios_') ||
                    key.includes('android_') ||
                    key.includes('update_')
                )
              ) {
                setShowUpdateReminder(true);
              }
            }
          }}
        >
          <OnboardingContext.Provider
            value={{ setIsOnboardingCompleted, setInitialAuthScreen }}
          >
            <HasMacrosContext.Provider
              value={{
                hasMacros,
                setHasMacros,
                readyForDashboard,
                setReadyForDashboard,
              }}
            >
              <IsProContext.Provider value={{ isPro, setIsPro }}>
                <NavigationContainer>
                  <PosthogProvider
                    apiKey={(Config.POSTHOG_API_KEY as string) || ''}
                    host={(Config.POSTHOG_HOST as string) || ''}
                    debug={__DEV__}
                    autocapture={false}
                    disableGeoip={false}
                    enableSessionReplay={Config.ENVIRONMENT === 'production'}
                    sessionReplayConfig={{
                      maskAllTextInputs: false,
                      maskAllImages: false,
                    }}
                  >
                    <MixpanelIdentifier />
                    <PosthogSessionReplayStarter />
                    <RemoteConfigHandler />
                    <RootStack
                      isOnboardingCompleted={isOnboardingCompleted}
                      initialAuthScreen={initialAuthScreen}
                      isAuthenticated={isAuthenticated}
                    />
                    {/* Update Reminder Modal - must be inside RemoteConfigProvider */}
                    <UpdateReminderModal
                      isVisible={showUpdateReminder}
                      onClose={() => setShowUpdateReminder(false)}
                    />
                  </PosthogProvider>
                </NavigationContainer>
              </IsProContext.Provider>
            </HasMacrosContext.Provider>
          </OnboardingContext.Provider>
        </RemoteConfigProvider>
        {/* Stallion update modal */}
        <StallionPopUp
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onRestart={() => restart()}
        />
      </MixpanelProvider>
    </>
  );
}

const WrappedApp = withStallion(App);
// Only wrap with Sentry in release
export default __DEV__ ? WrappedApp : Sentry.wrap(WrappedApp);
