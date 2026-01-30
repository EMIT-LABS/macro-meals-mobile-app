// src/screens/WelcomeScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext, useEffect, useState } from 'react';
import { HasMacrosContext } from 'src/contexts/HasMacrosContext';
import { RootStackParamList } from '../types/navigation';

import { useMixpanel } from '@macro-meals/mixpanel/src';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Config from 'react-native-config';
import PagerView from 'react-native-pager-view';
import BackButton from 'src/components/BackButton';
import { IsProContext } from 'src/contexts/IsProContext';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import revenueCatService from '../services/revenueCatService';
import { userService } from '../services/userService';
import useStore from '../store/useStore';
import { usePosthog } from '@macro-meals/posthog_service/src';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type _Profile = {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  is_pro?: boolean;
  has_macros?: boolean;
  meal_reminder_preferences_set?: boolean;
  is_active?: boolean;
};

// Helper function to get product information from RevenueCat offerings
const getProductInfo = (offerings: any, planType: 'monthly' | 'yearly') => {
  if (!offerings?.availablePackages) return null;

  const packageId =
    planType === 'monthly'
      ? 'com.macromeals.app.subscription.premium.monthly'
      : 'com.macromeals.app.subscription.premium.annual';
  const pkg = offerings.availablePackages.find(
    (p: any) => p.product.identifier === packageId
  );

  if (!pkg) return null;

  const product = pkg.product;

  return {
    price: product.priceString || product.price,
    pricePerPeriod: product.priceString || `${product.price}/${product.period}`,
    period: product.period,
    periodWithUnit:
      product.period === 'month'
        ? '1 month'
        : product.period === 'year'
          ? '1 year'
          : product.period,
    offerPeriod: product.introductoryPrice?.period || 'week',
    offerPeriodWithUnit:
      product.introductoryPrice?.period === 'week'
        ? '1 week'
        : product.introductoryPrice?.period === 'month'
          ? '1 month'
          : product.introductoryPrice?.period || '1 week',
    currencySymbol: product.currencySymbol || '£',
    originalPrice: product.originalPriceString || product.priceString,
  };
};

const Pager = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const _navigation = useNavigation<NavigationProp>();
  const handleBackPress = () => {
    // Option 1: Logout user to reset authentication state and return to login
    const { logout } = useStore.getState();
    logout();

    // Option 2: Alternative - Use navigation reset (uncomment if you prefer this)
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'Auth', params: { initialAuthScreen: 'LoginScreen' } }],
    // });
  };

  return (
    <View className="flex-1 max-h-[50%] min-h-[300px]">
      <PagerView
        style={{ flex: 1 }}
        orientation="horizontal"
        onPageSelected={e => {
          setCurrentPage(e.nativeEvent.position);
        }}
        initialPage={0}
      >
        <View key="1" style={{ flex: 1 }}>
          <SuccessStoryPager />
        </View>
        <View key="2" style={{ flex: 1 }}>
          <BenefitsPager />
        </View>
      </PagerView>
      <View
        className={`absolute w-full ${Platform.OS === 'ios' ? 'top-[5rem]' : 'top-[1rem]'} left-0`}
      >
        <View className="flex-row items-center justify-between px-4 mb-16">
          <BackButton onPress={handleBackPress} />
          <View className="flex-row gap-2 items-center">
            <Text className="text-2xl font-bold text-white">Macro Meals</Text>
            <View className="flex-row justify-center items-center gap-1 px-2 py-1 bg-primaryLigh rounded-md">
              <Image
                source={IMAGE_CONSTANTS.crown}
                className="w-[18px] h-[14px]"
              />
              <Text className="text-white mt-0.5 font-medium text-base">
                PREMIUM
              </Text>
            </View>
          </View>
          <View className="w-[40px]" />
        </View>
      </View>
      <View className="absolute bottom-4 w-full flex-row gap-2 justify-center items-center">
        {[0, 1].map(index => (
          <View
            key={index}
            className={`w-[10px] h-[10px] rounded-full ${
              index === currentPage ? 'bg-white' : 'bg-[#7A8F8E]'
            }`}
          />
        ))}
      </View>
    </View>
  );
};

const SuccessStoryPager = () => {
  return (
    <View className="relative">
      <Image
        source={IMAGE_CONSTANTS.successStoriesBg}
        className="w-full object-cover h-full"
      />
      <View className="absolute w-full items-center justify-center mt-[11rem]">
        <View className="w-full flex-row gap-1 items-center justify-center">
          {Array.from({ length: 5 }).map((_, index) => (
            <Image
              key={index}
              source={IMAGE_CONSTANTS.star}
              className="w-[20px] h-[20px] object-fit"
            />
          ))}
        </View>
        <Text className="mt-2 px-[30px] text-center leading-6 text-base font-normal text-white">
          I've gained 10 pounds in the last month. Very good for helping you get
          to or maintain a healthy lifestyle
        </Text>
        <Text className="mt-4 px-[30px] text-center leading-6 text-base font-medium text-white">
          by Amira, United Kingdom
        </Text>
      </View>
      <Text className="absolute bottom-10 w-full text-center text-white text-base font-medium">
        Join the success stories!
      </Text>
    </View>
  );
};

const BenefitsPager = () => {
  return (
    <View className="relative">
      <Image
        source={IMAGE_CONSTANTS.strawberryBg}
        className="w-full object-cover h-full"
      />
      <View className="absolute mt-[11rem] px-5 w-full">
        <View className="flex-row items-center justify-left w-full">
          <Image
            source={IMAGE_CONSTANTS.checkMark}
            className="w-[28px] h-[24px] mr-5 flex-shrink-0"
          />
          <Text className="text-sm font-semibold text-white flex-1">
            Barcode Scan: Skip the search and log faster
          </Text>
        </View>
        <View className="mt-12 flex-row items-center justify-left w-full">
          <Image
            source={IMAGE_CONSTANTS.checkMark}
            className="w-[28px] h-[24px] mr-5 flex-shrink-0"
          />
          <Text className="text-sm font-semibold text-white flex-1">
            Custom Macro Tracking: Find your balance of carbs, protein and fat.
          </Text>
        </View>
        <View className="mt-12 flex-row items-center justify-left w-full">
          <Image
            source={IMAGE_CONSTANTS.checkMark}
            className="w-[28px] h-[24px] mr-5 flex-shrink-0"
          />
          <Text className="text-sm font-semibold text-white flex-1">
            Zero Ads: Track and reach your goals, free from distractions.
          </Text>
        </View>
      </View>
    </View>
  );
};

const PaymentScreen = () => {
  // const navigation = useNavigation<NavigationProp>();
  const profile = useStore(state => state.profile);
  const _setStoreProfile = useStore(state => state.setProfile);
  const _clearProfile = useStore(state => state.clearProfile);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const setHasBeenPromptedForGoals = useStore(
    state => state.setHasBeenPromptedForGoals
  );
  const { setReadyForDashboard } = useContext(HasMacrosContext);
  const [_amount, setAmount] = useState(9.99);

  const { setIsPro } = useContext(IsProContext);
  const [offerings, setOfferings] = useState<any>(null);
  const [isCurrentlyInTrial, setIsCurrentlyInTrial] = useState(false);
  const [hasUsedTrialBefore, setHasUsedTrialBefore] = useState(false);
  const mixpanel = useMixpanel();
  const posthog = usePosthog()

  // Get product information for current selected plan
  const currentProductInfo = getProductInfo(
    offerings,
    selectedPlan as 'monthly' | 'yearly'
  );
  const monthlyProductInfo = getProductInfo(offerings, 'monthly');
  const yearlyProductInfo = getProductInfo(offerings, 'yearly');

  useEffect(() => {
    mixpanel?.track({
      name: 'paywall_viewed',
      properties: { platform: Platform.OS },
    });
    posthog?.track({
      name: 'paywall_viewed',
      properties: { platform: Platform.OS, $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences', },
    });
  }, [mixpanel, posthog]);
  // Load RevenueCat offerings when component mounts
  useEffect(() => {
    revenueCatService.syncPurchases();
    console.log(`\n\n\n\n\nUSER ID  ${profile?.id}\n\n\n\n\n`);
    const customerInfo = revenueCatService.getCustomerInfo();
    console.log(
      `\n\n\n\n\n\n\n\nPaymentScreen - REVENUECAT Customer info: ${JSON.stringify(customerInfo, null, 2)} \n\n\n\n\n\n\n\n`
    );
    const loadOfferings = async () => {
      try {
        const currentOfferings = await revenueCatService.getOfferings();
        setOfferings(currentOfferings);
      } catch (error) {
        console.error('Failed to load offerings:', error);
      }
    };

    loadOfferings();
  }, []);

  // Check current trial status when component mounts
  useEffect(() => {
    const checkCurrentTrialStatus = async () => {
      try {
        const trialStatus = await revenueCatService.checkTrialStatus();
        setIsCurrentlyInTrial(trialStatus);
        console.log('🔍 PaymentScreen - Current trial status:', trialStatus);

        // Also check if user has used a trial before
        const customerInfo = await revenueCatService.getCustomerInfo();
        const hasTrialHistory =
          customerInfo.entitlements.all['MacroMeals Premium']?.periodType ===
          'TRIAL';
        setHasUsedTrialBefore(hasTrialHistory);
        console.log(
          '🔍 PaymentScreen - Has used trial before:',
          hasTrialHistory
        );
      } catch (error) {
        console.error('Failed to check trial status:', error);
        setIsCurrentlyInTrial(false);
        setHasUsedTrialBefore(false);
      }
    };
    checkCurrentTrialStatus();
  }, []);

  const handleTrialSubscription = async () => {
    if (!profile?.has_used_trial) {
      mixpanel?.track({
        name: 'trial_started',
        properties: {
          $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
          plan: selectedPlan,
          price: currentProductInfo?.price,
          platform: Platform.OS,
        },
      });
      posthog?.track({
        name: 'trial_started',
        properties: {
          $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
          plan: selectedPlan,
          price: currentProductInfo?.price,
          platform: Platform.OS,
        },
      });
    }
    try {
      setIsLoading(true);

      // Get RevenueCat offerings
      const currentOfferings = await revenueCatService.getOfferings();
      if (!currentOfferings) {
        throw new Error('No subscription offerings available');
      }

      // Find the appropriate package based on selected plan
      let packageToPurchase;
      if (selectedPlan === 'monthly') {
        console.log('Platform: ', Platform.OS);
        packageToPurchase =
          Platform.OS === 'ios'
            ? currentOfferings.availablePackages.find(
                pkg => pkg.product.identifier === Config.IOS_PRODUCT_MONTHLY_ID
              )
            : currentOfferings.availablePackages.find(
                pkg =>
                  pkg.product.identifier === Config.ANDROID_PRODUCT_MONTHLY_ID
              );
      } else {
        packageToPurchase =
          Platform.OS === 'ios'
            ? currentOfferings.availablePackages.find(
                pkg => pkg.product.identifier === Config.IOS_PRODUCT_YEARLY_ID
              )
            : currentOfferings.availablePackages.find(
                pkg =>
                  pkg.product.identifier === Config.ANDROID_PRODUCT_YEARLY_ID
              );
      }

      if (!packageToPurchase) {
        throw new Error(`No package found for ${selectedPlan} plan`);
      }

      // Purchase the package
      const purchasePackage =
        await revenueCatService.purchasePackage(packageToPurchase);
      console.log(
        '🔍 PaymentScreen - Purchase completed, customerInfo:',
        JSON.stringify(purchasePackage, null, 2)
      );
      const customerInfo = await revenueCatService.getCustomerInfo();
      console.log(
        `\n\n\n\n\n\n\n\nPaymentScreen - REVENUECAT Customer info: ${JSON.stringify(customerInfo, null, 2)} \n\n\n\n\n\n\n\n`
      );

      // Check if purchase was successful by verifying active entitlements
      const entitlementId = 'MacroMeals Premium';
      const hasActiveEntitlement =
        customerInfo.entitlements.active[entitlementId] !== undefined;

      console.log('🔍 PaymentScreen - Entitlement check:', {
        entitlementId,
        hasActiveEntitlement,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      if (hasActiveEntitlement) {
        console.log('✅ Purchase successful, setting isPro to true');
        mixpanel?.track({
          name: 'subscription_started',
          properties: {
            
            plan: selectedPlan,
            price: currentProductInfo?.price,
            platform: Platform.OS,
          },
        });
        posthog?.track({
        name: 'subscription_started',
        properties: {
          $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
         plan: selectedPlan,
            price: currentProductInfo?.price,
            platform: Platform.OS,
        },
      });

        // Update local state
        setHasBeenPromptedForGoals(false);
        setReadyForDashboard(true);
        setIsPro(true);

        // Update user profile on backend (optional, if you want to sync with your backend)
        try {
          await userService.updateProfile({ is_pro: true });
          console.log('✅ Backend profile updated with pro status');
        } catch (error) {
          console.error(
            '⚠️ Failed to update backend profile, but RevenueCat subscription is active:',
            error
          );
        }

        Alert.alert(
          "You're in",
          "Your subscription is confirmed. Let's hit those goals, one meal at a time.",
          [
            {
              text: 'Continue',
              onPress: () => {
                // Force navigation to Dashboard using CommonActions
                // navigation.dispatch(
                //   CommonActions.reset({
                //     index: 0,
                //     routes: [
                //       {
                //         name: 'Dashboard',
                //       },
                //     ],
                //   })
                // );
              },
            },
          ]
        );
      } else {
        throw new Error(
          'Purchase completed but no active entitlements found. Please contact support.'
        );
      }
    } catch (error) {
      console.error('Error in trial subscription:', error);

      let errorMessage = 'Failed to complete purchase. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }
      mixpanel?.track({
        name: 'subscription_failed',
        properties: {
          plan: selectedPlan,
          error_type: errorMessage,
          platform: Platform.OS,
        },
      });
       posthog?.track({
        name: 'subscription_failed',
        properties: {
          $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
          plan: selectedPlan,
          error_type: errorMessage,
          platform: Platform.OS,
        },
      });
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View className="flex-1 bg-[#F2F2F2]">
        <Pager />
        <View className="flex-1 px-5 py-4 justify-center items-center w-full">
          <Text className="text-base font-medium text-center">
            Select a plan for your free trial
          </Text>
          <View className="flex-row w-full gap-3 justify-between mt-6">
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 bg-white rounded-2xl ${
                selectedPlan === 'monthly'
                  ? 'border-primaryLight border-2'
                  : 'border border-[#F2F2F2]'
              }`}
              onPress={e => {
                e.preventDefault();
                setSelectedPlan('monthly');
                setAmount(monthlyProductInfo?.price || 9.99);
                mixpanel?.track({
                  name: 'subscription_plan_selected',
                  properties: {
                    $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
                    plan: 'monthly',
                    price: monthlyProductInfo?.price,
                    platform: Platform.OS,
                  },
                });
                 posthog?.track({
                  name: 'subscription_plan_selected',
                  properties: {
                    $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
                    plan: 'monthly',
                    price: monthlyProductInfo?.price,
                    platform: Platform.OS,
                  },
                });
              }}
            >
              <View className="w-full pl-3 pt-6 pb-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-base font-medium rounded-md">
                    MONTHLY
                  </Text>
                  {selectedPlan === 'monthly' && (
                    <Image
                      source={IMAGE_CONSTANTS.checkPrimary}
                      className="w-[16px] h-[16px] mr-5"
                    />
                  )}
                </View>
                <View className="mt-3">
                  <Text className="font-medium text-[15px]">
                    {monthlyProductInfo?.pricePerPeriod || '£9.99/mo'}
                  </Text>
                </View>
                <Text className="mt-3 mb-3 text-[11px] text-[#4F4F4F]">
                  Billed {monthlyProductInfo?.period || 'monthly'} after free
                  trial.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 items-center bg-white rounded-2xl ${selectedPlan === 'yearly' ? 'border-primary border-2' : 'border border-[#F2F2F2]'}`}
              onPress={e => {
                e.preventDefault();
                setSelectedPlan('yearly');
                setAmount(yearlyProductInfo?.price || 69.99);
                mixpanel?.track({
                  name: 'subscription_plan_selected',
                  properties: {
                    
                    plan: 'yearly',
                    price: yearlyProductInfo?.price,
                    platform: Platform.OS,
                  },
                });
                posthog?.track({
                  name: 'subscription_plan_selected',
                  properties: {
                        $screen_name: 'NotificationPreferences',
            $current_url: 'NotificationPreferences',
                    plan: 'yearly',
                    price: yearlyProductInfo?.price,
                    platform: Platform.OS,
                  },
                });
              }}
            >
              <View className="absolute px-2 py-1.5 top-[-10px] flex-row bg-primaryLight rounded-3xl">
                <Text className="text-white text-xs font-medium justify-center items-center">
                  30% savings
                </Text>
              </View>
              <View className="w-full pl-3 pt-6 pb-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-base font-medium rounded-md">
                    YEARLY
                  </Text>
                  {selectedPlan === 'yearly' && (
                    <Image
                      source={IMAGE_CONSTANTS.checkPrimary}
                      className="w-[16px] h-[16px] mr-5"
                    />
                  )}
                </View>
                <View className="mt-3">
                  <Text className="font-medium text-[15px]">
                    {yearlyProductInfo?.pricePerPeriod || '£69.99/yr'}
                  </Text>
                  {yearlyProductInfo?.originalPrice && (
                    <Text className="mt-1 font-medium text-[13px] text-decoration-line: line-through text-[#4F4F4F]">
                      {yearlyProductInfo.originalPrice}
                    </Text>
                  )}
                </View>
                <Text className="mt-3 mb-3 text-[11px] text-[#4F4F4F]">
                  Billed {yearlyProductInfo?.period || 'yearly'} after free
                  trial.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text className="mt-4 text-[12px] text-[#4F4F4F] text-center">
            You can change plans or cancel anytime
          </Text>
          {/* {__DEV__ && (
              <TouchableOpacity className='mt-2 px-2 py-2 rounded-lg bg-gloomyPurple' onPress={() => {
                revenueCatService.restorePurchases();
              }}>
                <View>
                  <Text className="text-white font-semibold text-[17px]">
                    Restore Subscription
                  </Text>
                </View>
              </TouchableOpacity>
            )} */}
          <View className="w-full mt-6 mb-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTrialSubscription}
              disabled={isLoading}
              className={isLoading ? 'opacity-70' : 'mt-5'}
            >
              <View className="bg-primaryLight h-[50px] w-full flex-row items-center justify-center rounded-[100px]">
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-[17px]">
                    {isCurrentlyInTrial
                      ? `Continue ${currentProductInfo?.offerPeriodWithUnit || '7-Day'} Free Trial`
                      : hasUsedTrialBefore
                        ? `Subscribe to ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} plan`
                        : `Start ${currentProductInfo?.offerPeriodWithUnit || '7-Day'} Free Trial`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
};

export default PaymentScreen;
