import { useRemoteConfigContext } from '@macro-meals/remote-config-service';
import React, { useContext } from 'react';
import Config from 'react-native-config';

import MealFinderScreen from 'src/screens/MealFinderScreen';
import SearchMealAndRestaurants from 'src/screens/SearchMealAndRestaurants';
import { HasMacrosContext } from './src/contexts/HasMacrosContext';
import { IsProContext } from './src/contexts/IsProContext';
import BarcodeScanScreen from './src/screens/BarcodeScanScreen';
import MealLogScreen from './src/screens/MealLogScreen';
import ScanScreenType from './src/screens/ScanScreenType';
import SettingsScreen from './src/screens/SettingsScreen';
import SnapMealScreen from './src/screens/SnapMealScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
// import { NearbyMealsScreen } from "./src/screens/NearbyMealsScreen";
import MealFinderBreakdownScreen from './src/screens/MealFinderBreakdown';
// import { DashboardScreen } from "./src/screens/DashboardScreen";
import { GoalSetupScreen } from './src/screens/GoalSetupScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import MacroGoalsScreen from './src/screens/MacroGoalsScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { SignupScreen } from './src/screens/SignupScreen';

import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { VerificationScreen } from './src/screens/VerificationScreen';
// import { MealListScreen } from "./src/screens/MealListScreen";
import { createStackNavigator } from '@react-navigation/stack';
import PaymentScreen from './src/screens/PaymentScreen';
// import { useMixpanel } from "@macro-meals/mixpanel";
import './src/globals.css';
// import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomBottomTabs from './src/navigation/BottomTabNavigation';
import { ResetPasswordScreen } from './src/screens/ResetPassword';
import { RootStackParamList } from './src/types/navigation';
// import AddMeal from "./src/screens/AddMeal";
import AISuggestedMealsDetailsScreen from 'src/screens/AISuggestedMealsDetails';
import AccountSettingsScreen from 'src/screens/AccountSettingsScreen';
import AddSearchedLoggedMealScreen from 'src/screens/AddSearchedLoggedMealScreen';
import { AdjustGoalsFlow } from 'src/screens/AdjustGoals';
import AiMealSuggestionsScreen from 'src/screens/AiMealSuggestionsScreen';
import EditMealScreen from 'src/screens/EditMealScreen';
import { EmailVerificationScreen } from 'src/screens/EmailVerificationScreen';
import { GoalsSetupFlow } from 'src/screens/GoalsSetupFlow';
import HealthGuidelinesScreen from 'src/screens/HealthGuidelinesScreen';
import ManageSubscriptionsScreen from 'src/screens/ManageSubscriptionsScreen';
import AIRecipeDetailsScreen from './src/screens/AIRecipeDetailsScreen';
import AboutScreen from './src/screens/AboutScreen';
import AddMealScreen from './src/screens/AddMealScreen';
import AdjustTargetsScreen from './src/screens/AdjustTargetsScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationsPreferences from './src/screens/NotificationsPreferences';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import RequestRestaurantScreen from './src/screens/RequestRestaurantScreen';
import ScannedMealBreakdownScreen from './src/screens/ScannedMealBreakdown';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import RedeemReferralCodeScreen from './src/screens/RedeemReferralCodeScreen';

const Stack = createStackNavigator<RootStackParamList>();

export function RootStack({
  isOnboardingCompleted,
  isAuthenticated,
  initialAuthScreen,
}: {
  isOnboardingCompleted: boolean;
  isAuthenticated: boolean;
  initialAuthScreen: string;
}) {
  // Get values from context instead of props for better reactivity
  const { hasMacros, readyForDashboard } = useContext(HasMacrosContext);
  const { isPro } = useContext(IsProContext);

  // Note: Subscription status is now handled in App.tsx during session validation
  // This prevents race conditions and ensures proper routing on first load

  // Get dev mode from remote config (ignored in production)
  const { getValue, isInitialized } = useRemoteConfigContext();
  let devMode = false;

  // Only try to get dev_mode if remote config is initialized
  if (isInitialized) {
    try {
      // Only allow dev_mode to bypass payment in non-production environments
      const currentEnv = Config.ENVIRONMENT;

      if (currentEnv !== 'production') {
        const devModeValue = getValue('dev_mode');
        devMode = devModeValue.asBoolean();
      } else {
        devMode = false;
      }
    } catch (error) {
      console.log(
        '🔍 RootStack - Could not get dev_mode from remote config, defaulting to false:',
        error
      );
      devMode = false;
    }
  } else {
    console.log(
      '⚠️ RootStack - Remote config not initialized yet, dev_mode defaults to false'
    );
    // Only enable dev mode bypass if explicitly configured
    // This prevents automatic bypass in development
  }

  // Simplified routing logic - App.tsx handles session validation
  const shouldShowLogin = !isAuthenticated;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboardingCompleted ? (
        <Stack.Screen name="OnboardingNav" component={OnboardingNavigator} />
      ) : shouldShowLogin ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          initialParams={{ initialAuthScreen: initialAuthScreen }}
        />
      ) : hasMacros && readyForDashboard ? (
        isPro || devMode ? (
          <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        ) : (
          <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
        )
      ) : (
        <Stack.Screen name="GoalSetupNav" component={GoalSetupNavigator} />
      )}
    </Stack.Navigator>
  );
}

const AuthNavigator = ({
  route,
}: {
  route: { params?: { initialAuthScreen: string } };
}) => {
  const initialScreen = route.params?.initialAuthScreen || 'LoginScreen';
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialScreen as any}
    >
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen
        name="ForgotPasswordScreen"
        component={ForgotPasswordScreen}
      />
      <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SignupScreen" component={SignupScreen} />
      <Stack.Screen
        name="TermsOfServiceScreen"
        component={TermsOfServiceScreen}
      />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen
        name="EmailVerificationScreen"
        component={EmailVerificationScreen}
      />
    </Stack.Navigator>
  );
};

const OnboardingNavigator = () => {
  // const handleGetStartedClick = async () => {
  //   try {
  //     await AsyncStorage.setItem("isOnboardingCompleted", "true");
  //   } catch (error) {
  //     console.error("Error saving onboarding status:", error);
  //   }
  // };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

const GoalSetupNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GoalSetupScreen" component={GoalSetupScreen} />
      <Stack.Screen name="GoalsSetupFlow" component={GoalsSetupFlow} />
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
    </Stack.Navigator>
  );
};

const DashboardNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={CustomBottomTabs} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="BarcodeScanScreen" component={BarcodeScanScreen} />
      <Stack.Screen name="AddMealScreen" component={AddMealScreen} />
      <Stack.Screen name="EditMealScreen" component={EditMealScreen} />
      <Stack.Screen name="SnapMeal" component={SnapMealScreen} />
      <Stack.Screen
        name="NotificationsScreen"
        component={NotificationsScreen}
      />
      <Stack.Screen
        name="AccountSettingsScreen"
        component={AccountSettingsScreen}
      />
      <Stack.Screen name="MealLog" component={MealLogScreen} />
      <Stack.Screen
        name="AiMealSuggestionsScreen"
        component={AiMealSuggestionsScreen}
      />
      <Stack.Screen
        name="AIRecipeDetailsScreen"
        component={AIRecipeDetailsScreen}
      />
      <Stack.Screen name="ScanScreenType" component={ScanScreenType} />
      <Stack.Screen
        name="ManageSubscriptionsScreen"
        component={ManageSubscriptionsScreen}
      />
      <Stack.Screen name="MacroGoals" component={MacroGoalsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsPreferences} />
      <Stack.Screen name="MealFinderScreen" component={MealFinderScreen} />
      <Stack.Screen
        name="SearchMealAndRestaurants"
        component={SearchMealAndRestaurants}
      />
      <Stack.Screen
        name="MealFinderBreakdownScreen"
        component={MealFinderBreakdownScreen}
      />
      <Stack.Screen
        name="ScannedMealBreakdownScreen"
        component={ScannedMealBreakdownScreen}
      />
      <Stack.Screen
        name="AISuggestedMealsDetailsScreen"
        component={AISuggestedMealsDetailsScreen}
      />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen
        name="ForgotPasswordScreen"
        component={ForgotPasswordScreen}
      />
      <Stack.Screen name="AdjustTargets" component={AdjustTargetsScreen} />
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
      <Stack.Screen
        name="HealthGuidelinesScreen"
        component={HealthGuidelinesScreen}
      />
      <Stack.Screen
        name="TermsOfServiceScreen"
        component={TermsOfServiceScreen}
      />
      <Stack.Screen
        name="AddSearchedLoggedMeal"
        component={AddSearchedLoggedMealScreen}
      />
      <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="GoalsSetupFlow" component={GoalsSetupFlow} />
      <Stack.Screen
        name="AdjustGoalsFlow"
        component={AdjustGoalsFlow}
        options={{
          // Disable iOS swipe-back gesture for this screen
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="RequestRestaurantScreen"
        component={RequestRestaurantScreen}
      />
      <Stack.Screen
        name="RedeemReferralCodeScreen"
        component={RedeemReferralCodeScreen}
      />
    </Stack.Navigator>
  );
};
