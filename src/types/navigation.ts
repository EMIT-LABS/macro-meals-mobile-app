import { Meal } from '../types';

/**
 * Type definitions for navigation in the app.
 */
/**
 * Root stack parameter list for the main navigation stack.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  OnboardingNav: undefined;
  OnboardingScreen: undefined;
  Auth: { initialAuthScreen: string };
  Dashboard: undefined;
  WelcomeScreen: undefined;
  AccountSettings: undefined;
  Login: undefined;
  SignUp: undefined;
  MacroInput: undefined;
  ForgotPasswordScreen: { source: string };
  VerificationScreen: { email: string; source: string };
  ResetPassword: {
    email: string;
    session_token: string;
    otp: string;
    source: string;
  };
  MealList: undefined;
  SettingsScreen: undefined;
  ScanScreenType?: {defaultDate?: string;};
  MainTabs: { screen?: string } | undefined;
  BarcodeScanScreen?: {defaultDate?: string;};
  GoalSetupScreen: undefined;
  GoalsBasicInfo: undefined;
  AddMeal: undefined;
  AddMealScreen: {
    analyzedData?: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      quantity: number;
      amount?: number;
      serving_unit?: string;
      is_favourite?: boolean;
      meal_type?: string;
      meal_time?: string;
      logging_mode?: string;
    };
    defaultDate?: string;
  };
  SnapMeal?: {defaultDate?: string;};
  MealLog: undefined;
  NearbyMeals: undefined;
  DashboardScreen: undefined;
  LoginScreen: undefined;
  PaymentScreen: undefined;
  SignupScreen: undefined;
  MacroGoals: undefined;
  CustomBottomTabs: { screen?: string } | undefined;
  Notifications: undefined;
  TermsOfServiceScreen: undefined;
  About: undefined;
  MealFinderScreen?: {defaultDate?: string;};
  MealFinderBreakdownScreen?: { meal: any, defaultDate?: string;};
  SearchMealAndRestaurants: { defaultResults?: Meal[] } | undefined;
  PrivacyPolicy: undefined;
  AiMealSuggestionsScreen?: {defaultDate?: string;};
  GoalsSetupFlow: undefined;
  ChangePassword: undefined;
  AdjustTargets: undefined;
  Progress: undefined;
  AccountSettingsScreen: undefined;
  AISuggestedMealsDetailsScreen: { meal: any, defaultDate?: string; };
  GoalSetupNav: undefined;
  NotificationsScreen: undefined;
  EditMealScreen: {
    analyzedData?: {
      id: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      meal_type?: string;
      serving_unit?: string;
      amount?: number;
      logging_mode?: string;
      meal_time?: string;
      photo_url?: string;
      read_only?: boolean;
    };
  };
  EmailVerificationScreen: { email: string; password: string };
  AddSearchedLoggedMeal: {
    searchedMeal: {
      id: string;
      name: string;
      description: string | null;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      amount: number;
      serving_unit: string;
      read_only: boolean;
      barcode?: string;
      notes?: string;
      photo_url?: string | null;
    };
  };
  HealthGuidelinesScreen: undefined;
  ManageSubscriptionsScreen: undefined;
  ScannedMealBreakdownScreen?: { meal: any, defaultDate?: string};
  AIRecipeDetailsScreen: { recipe: any, defaultDate?:string };
  AdjustGoalsFlow: undefined;
  RequestRestaurantScreen: {
    restaurantName?: string;
  };
};
