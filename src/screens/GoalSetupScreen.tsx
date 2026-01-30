import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import { RootStackParamList } from 'src/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useGoalsFlowStore } from 'src/store/goalsFlowStore';
import useStore from 'src/store/useStore';
import { useRemoteConfigContext } from '@macro-meals/remote-config-service';
import { HasMacrosContext } from '../contexts/HasMacrosContext';
import { IsProContext } from '../contexts/IsProContext';
import { useContext } from 'react';
import Config from 'react-native-config';
import { useMixpanel } from '@macro-meals/mixpanel/src';
import { Platform } from 'react-native';
import { usePosthog } from '@macro-meals/posthog_service/src';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GoalSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    completed,
    majorStep,
    setMajorStep,
    setSubStep,
    navigateToMajorStep,
  } = useGoalsFlowStore();
  const setHasBeenPromptedForGoals = useStore(
    state => state.setHasBeenPromptedForGoals
  );
  const profile = useStore(state => state.profile);
  const posthog = usePosthog();

  // Debug profile state
  console.log('🔍 GoalSetup - Component render - Profile:', profile);
  console.log(
    '🔍 GoalSetup - Component render - Profile type:',
    typeof profile
  );

  const { getValue, debugLogAllValues } = useRemoteConfigContext();
  const { setReadyForDashboard } = useContext(HasMacrosContext);
  const { setIsPro } = useContext(IsProContext);
  const mixpanel = useMixpanel();

  React.useEffect(() => {
    mixpanel?.track({
      name: 'onboarding_welcome_viewed',
      properties: { platform: Platform.OS },
    });
    posthog?.track({
      name: 'onboarding_welcome_viewed',
      properties: {
        platform: Platform.OS,
        $screen_name: 'GoalSetupScreen',
        $current_url: 'GoalSetupScreen',
      },
    });
  }, [mixpanel, posthog]);
  // Only allow dev_mode to bypass payment in non-production environments
  let devMode = false;
  try {
    const currentEnv = Config.ENVIRONMENT;
    if (currentEnv !== 'production') {
      devMode = getValue('dev_mode').asBoolean();
    } else {
      console.log(
        '[GOAL SETUP] Production environment detected, ignoring dev_mode remote config'
      );
      devMode = false;
    }
  } catch (error) {
    console.log(
      '[GOAL SETUP] Could not get dev_mode from remote config, defaulting to false:',
      error
    );
    devMode = false;
  }

  // Debug: Test force_update variable
  React.useEffect(() => {
    try {
      const forceUpdateValue = getValue('force_update');
      console.log('[GOAL SETUP] 🔧 force_update value:', {
        stringValue: forceUpdateValue.asString(),
        booleanValue: forceUpdateValue.asBoolean(),
        numberValue: forceUpdateValue.asNumber(),
        source: forceUpdateValue.getSource(),
      });
    } catch (error) {
      console.error('[GOAL SETUP] ❌ Error getting force_update:', error);
    }

    // Also log all available values
    debugLogAllValues();
  }, [getValue, debugLogAllValues]);

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      <ScrollView
        className="relative flex-1 mx-4"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1">
          {/* <View className="flex-row items-center justify-between">
                    <BackButton onPress={() => {
                        setHasBeenPromptedForGoals(false);
                        navigation.navigate('MainTabs' as never);
                    }} />
                </View> */}
          <View className="items-start justify-start mt-4">
            <Text className="text-3xl font-bold">Welcome</Text>
            <Text className="mt-2 leading-7 font-normal text-lg text-textMediumGrey">
              Set up your personalized macro plan in three simple steps. Each
              completed stage brings you closer to nutrition targets tailored to
              your body and goals.
            </Text>
          </View>
          <View className="flex-col gap-4 mt-8">
            <TouchableOpacity
              className={`h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3 ${completed[0]?.every(Boolean) ? 'bg-gray' : 'bg-gray opacity-50'}`}
              onPress={() => {
                if (completed[0]?.every(Boolean)) {
                  navigateToMajorStep(0);
                  navigation.navigate('GoalsSetupFlow');
                }
              }}
              disabled={!completed[0]?.every(Boolean)}
              activeOpacity={completed[0]?.every(Boolean) ? 0.8 : 1}
            >
              <Image
                source={IMAGE_CONSTANTS.personAltIcon}
                className="w-[16px] h-[16px]"
              />
              <Text
                className={`text-base font-normal ${completed[0]?.every(Boolean) ? 'text-primary' : 'text-gray-500'}`}
              >
                Basic info
              </Text>
              {completed[0]?.every(Boolean) && (
                <Image
                  source={IMAGE_CONSTANTS.checkPrimary}
                  className="absolute right-6 w-[20px] h-[20px]"
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className={`h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3 ${completed[1]?.every(Boolean) ? 'bg-gray' : 'bg-gray opacity-50'}`}
              onPress={() => {
                if (completed[1]?.every(Boolean)) {
                  navigateToMajorStep(1);
                  navigation.navigate('GoalsSetupFlow');
                }
              }}
              disabled={!completed[1]?.every(Boolean)}
              activeOpacity={completed[1]?.every(Boolean) ? 0.8 : 1}
            >
              <View className="flex-row items-center justify-center gap-3">
                <Image
                  source={IMAGE_CONSTANTS.goalTargetIcon}
                  className="w-[16px] h-[16px]"
                />
                <Text
                  className={`text-base font-normal ${completed[1]?.every(Boolean) ? 'text-primary' : 'text-gray-500'}`}
                >
                  Your goal
                </Text>
              </View>
              {completed[1]?.every(Boolean) && (
                <Image
                  source={IMAGE_CONSTANTS.checkPrimary}
                  className="absolute right-6 w-[20px] h-[20px]"
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className={`h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3 ${completed[2]?.every(Boolean) ? 'bg-gray' : 'bg-gray opacity-50'}`}
              onPress={() => {
                if (completed[2]?.every(Boolean)) {
                  navigateToMajorStep(2);
                  navigation.navigate('GoalsSetupFlow');
                }
              }}
              disabled={!completed[2]?.every(Boolean)}
              activeOpacity={completed[2]?.every(Boolean) ? 0.8 : 1}
            >
              <Image
                source={IMAGE_CONSTANTS.navIcon}
                className="w-[16px] h-[16px]"
              />
              <Text
                className={`text-base font-normal ${completed[2]?.every(Boolean) ? 'text-primary' : 'text-gray-500'}`}
              >
                Your plan
              </Text>
              {completed[2]?.every(Boolean) && (
                <Image
                  source={IMAGE_CONSTANTS.checkPrimary}
                  className="absolute right-6 w-[20px] h-[20px]"
                />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="absolute bottom-5 left-0 right-0 bg-primary h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3"
            onPress={async () => {
              console.log(
                '\n\n\n\n\n\n\n\n\n\n\n\n🔍 GoalSetup - Button pressed! Checking completion status...'
              );
              console.log('🔍 GoalSetup - completed state:', completed);
              console.log('🔍 GoalSetup - completed[0]:', completed[0]);
              console.log('🔍 GoalSetup - completed[1]:', completed[1]);
              console.log('🔍 GoalSetup - completed[2]:', completed[2]);

              const allCompleted =
                completed[0]?.every(Boolean) &&
                completed[1]?.every(Boolean) &&
                completed[2]?.every(Boolean);
              console.log('🔍 GoalSetup - allCompleted result:', allCompleted);

              if (allCompleted) {
                // Check subscription status from RevenueCat before routing
                useEffect(() => {
                  posthog?.track({
                    name: 'plan_confirmed',
                    properties: {
                      platform: Platform.OS,
                      $screen_name: 'GoalSetupScreen',
                      $current_url: 'GoalSetupScreen',
                    },
                  });
                });
                try {
                  const { revenueCatService } = await import(
                    '../services/revenueCatService'
                  );

                  console.log(
                    '🔍 GoalSetup - Starting subscription check process...'
                  );

                  // First, sync purchases to ensure we have the latest data
                  console.log(
                    '🔄 GoalSetup - Syncing purchases to check for existing subscriptions...'
                  );
                  try {
                    await revenueCatService.syncPurchases();
                    console.log('✅ GoalSetup - Purchases synced successfully');
                  } catch (syncError) {
                    console.error(
                      '❌ GoalSetup - Failed to sync purchases:',
                      syncError
                    );
                  }

                  // Get customer info for detailed logging
                  console.log(
                    '🔍 GoalSetup - Getting customer info for detailed analysis...'
                  );
                  const customerInfo =
                    await revenueCatService.getCustomerInfo();
                  console.log('🔍 GoalSetup - Full RevenueCat customer info:', {
                    originalAppUserId: customerInfo.originalAppUserId,
                    activeEntitlements: Object.keys(
                      customerInfo.entitlements.active
                    ),
                    allEntitlements: Object.keys(customerInfo.entitlements.all),
                    activeSubscriptions: customerInfo.activeSubscriptions,
                    allPurchaseDates: customerInfo.allPurchaseDates,
                    allExpirationDates: customerInfo.allExpirationDates,
                    subscriptionsByProductIdentifier: Object.keys(
                      customerInfo.subscriptionsByProductIdentifier
                    ),
                  });

                  // Check subscription status
                  const subscriptionStatus =
                    await revenueCatService.checkSubscriptionStatus();

                  console.log(
                    '🔍 GoalSetup - RevenueCat subscription status check:',
                    subscriptionStatus
                  );

                  // If no subscription found with current method, try email-based lookup and linking
                  if (!subscriptionStatus.isPro) {
                    console.log(
                      '🔍 GoalSetup - No subscription found with standard check, trying email-based lookup...'
                    );

                    // Get user email and ID from profile hook
                    console.log('🔍 GoalSetup - Profile object:', profile);
                    console.log('🔍 GoalSetup - Profile type:', typeof profile);
                    console.log(
                      '🔍 GoalSetup - Profile keys:',
                      profile ? Object.keys(profile) : 'null/undefined'
                    );

                    // Try to get profile from store state as fallback
                    const storeState = useStore.getState();
                    console.log(
                      '🔍 GoalSetup - Store state profile:',
                      storeState.profile
                    );

                    // If profile is not available, try to fetch it from the API
                    let userEmail = profile?.email || storeState.profile?.email;
                    let userId = profile?.id || storeState.profile?.id;

                    if (!userEmail || !userId) {
                      console.log(
                        '🔍 GoalSetup - Profile not available, fetching from API...'
                      );
                      try {
                        const { userService } = await import(
                          '../services/userService'
                        );
                        const fetchedProfile = await userService.getProfile();
                        console.log(
                          '🔍 GoalSetup - Fetched profile from API:',
                          fetchedProfile
                        );

                        // Store the profile in the store for future use
                        const { setProfile } = useStore.getState();
                        setProfile(fetchedProfile);

                        userEmail = fetchedProfile.email;
                        userId = fetchedProfile.id;

                        console.log(
                          '🔍 GoalSetup - Updated email and ID from API:',
                          { userEmail, userId }
                        );
                      } catch (error) {
                        console.error(
                          '❌ GoalSetup - Failed to fetch profile from API:',
                          error
                        );
                      }
                    }

                    console.log('🔍 GoalSetup - Extracted email:', userEmail);
                    console.log('🔍 GoalSetup - Extracted ID:', userId);

                    if (userEmail && userId) {
                      console.log('🔍 GoalSetup - User email:', userEmail);
                      console.log('🔍 GoalSetup - User ID:', userId);

                      // Step 1: Set email as RevenueCat attribute to help find existing customer
                      console.log(
                        '🔍 GoalSetup - Setting email as RevenueCat attribute...'
                      );
                      await revenueCatService.setAttributes({
                        $email: userEmail,
                      });

                      // Step 2: Check for existing subscription by email
                      console.log(
                        '🔍 GoalSetup - Checking for existing subscription by email...'
                      );
                      const emailCheckResult =
                        await revenueCatService.checkForExistingSubscription(
                          userEmail
                        );

                      if (emailCheckResult.hasSubscription) {
                        console.log(
                          '✅ GoalSetup - Found existing subscription by email!'
                        );
                        console.log(
                          '🔍 GoalSetup - Email check result:',
                          emailCheckResult
                        );

                        // Step 3: Link the new user ID to the existing subscription
                        console.log(
                          '🔍 GoalSetup - Linking new user ID to existing subscription...'
                        );
                        const linkResult =
                          await revenueCatService.linkExistingSubscription(
                            userId,
                            userEmail
                          );

                        if (linkResult.success) {
                          console.log(
                            '✅ GoalSetup - Successfully linked existing subscription to new user ID!'
                          );
                          setIsPro(true);
                          setReadyForDashboard(true);
                          setHasBeenPromptedForGoals(false);
                          return;
                        } else {
                          console.log(
                            '⚠️ GoalSetup - Found subscription but failed to link to new user ID'
                          );
                          console.log(
                            '🔍 GoalSetup - Link result:',
                            linkResult
                          );
                          setIsPro(false);
                        }
                      } else {
                        console.log(
                          '❌ GoalSetup - No existing subscription found by email'
                        );
                        setIsPro(false);
                      }
                    } else {
                      console.log(
                        '⚠️ GoalSetup - Missing user email or ID for subscription check'
                      );
                      console.log(
                        '🔍 GoalSetup - Email:',
                        userEmail,
                        'ID:',
                        userId
                      );
                      setIsPro(false);
                    }
                  } else {
                    console.log(
                      '✅ GoalSetup - User already has active subscription'
                    );
                    setIsPro(subscriptionStatus.isPro);
                  }

                  // Get the final isPro state (it was set in the email check above)
                  const currentIsPro = subscriptionStatus.isPro; // This will be updated by the email check if needed

                  if (currentIsPro || devMode) {
                    // User has active RevenueCat entitlements or dev mode - go to dashboard
                    console.log(
                      '🔍 GoalSetup - User has active subscription or dev mode, going to dashboard'
                    );
                    setHasBeenPromptedForGoals(false);
                    setReadyForDashboard(true);
                    return;
                  } else {
                    // User needs subscription - go to payment screen
                    console.log(
                      '🔍 GoalSetup - User needs subscription, going to payment screen'
                    );
                    navigation.navigate('PaymentScreen'); // BLOCKED FOR TESTING
                    setHasBeenPromptedForGoals(false);
                    return;
                  }
                } catch (error) {
                  console.error(
                    '❌ GoalSetup - Failed to check RevenueCat subscription status:',
                    error
                  );
                  // Fallback to payment screen if check fails
                  navigation.navigate('PaymentScreen'); // BLOCKED FOR TESTING
                  setHasBeenPromptedForGoals(false);
                  return;
                }
              } else {
                console.log(
                  '🔍 GoalSetup - Not all steps completed, continuing with normal flow...'
                );
                console.log('🔍 GoalSetup - majorStep:', majorStep);
                console.log(
                  '🔍 GoalSetup - completed[majorStep]:',
                  completed[majorStep]
                );
              }

              if (completed[majorStep]?.every(Boolean) && majorStep < 2) {
                console.log('🔍 GoalSetup - Moving to next major step...');
                setMajorStep(majorStep + 1);
                setSubStep(majorStep + 1, 0);
              }
              console.log('🔍 GoalSetup - Navigating to GoalsSetupFlow...');
              navigation.navigate('GoalsSetupFlow');
            }}
          >
            <Text className="text-base font-normal text-white">
              {(() => {
                const allCompleted =
                  completed[0]?.every(Boolean) &&
                  completed[1]?.every(Boolean) &&
                  completed[2]?.every(Boolean);
                if (allCompleted) return "Let's get started";
                if (majorStep === 2) return 'Confirm';
                return 'Continue';
              })()}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </CustomSafeAreaView>
  );
};
