import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CircularProgress } from '../components/CircularProgress';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import { LinearProgress } from '../components/LinearProgress';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { userService } from '../services/userService';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';

// type RootStackParamList = {
//     MacroInput: undefined;
//     Scan: undefined;
//     MealLog: {
//         date: string;
//     };
//     Settings: undefined;
//     SettingsScreen: undefined;
// };

// Use the Profile type from the store instead of defining a local one
import { useMixpanel } from '@macro-meals/mixpanel';
import { usePosthog } from '@macro-meals/posthog_service/src';
import axiosInstance from 'src/services/axios';
import { Profile } from '../store/useStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface _TodayMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_time: string;
  created_at: string;
  user_id: string;
  photo_url?: string;
  logging_mode?: string;
  amount?: number;
  serving_unit?: string;
  read_only?: boolean;
  meal_type?: string;
}

export const DashboardScreen: React.FC = () => {
  console.log('🔍 DashboardScreen - Rendering DashboardScreen');
  const navigation = useNavigation<NavigationProp>();
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();

  // State for user data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [macros, setMacros] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  });
  const todayProgress = useStore(state => state.todayProgress);
  const fetchTodayProgress = useStore(state => state.fetchTodayProgress);

  const [profile, setProfile] = useState<Profile>({
    display_name: undefined,
    email: undefined,
    avatar_url: undefined,
    first_name: undefined,
    last_name: undefined,
    gender: undefined,
    is_active: undefined,
    is_pro: undefined,
    meal_reminder_preferences_set: undefined,
    has_macros: undefined,
  });

  const userId = useStore(state => state.userId);
  const token = useStore(state => state.token);
  const preferences = useStore(state => state.preferences);
  const setStoreProfile = useStore(state => state.setProfile);
  const setMacrosPreferences = useStore(state => state.setMacrosPreferences);
  const loggedMeals = useStore(state => state.loggedMeals);
  const refreshMeals = useStore(state => state.refreshMeals);
  const hasLoggedFirstMeal = useStore(state => state.hasLoggedFirstMeal);
  const mixpanel = useMixpanel();
  const posthog = usePosthog();
  const eventsFired = useRef(false);
  const userIdentified = useRef(false); // Track if user has been identified in PostHog
  const [loggedMealsPresent , setLoggedMealsPresent] = useState(false)

  // Calculate today's total macros from loggedMeals
  const todayMealsSum = loggedMeals.reduce(
    (acc: any, meal: any) => ({
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
    }),
    { carbs: 0, fat: 0, protein: 0 }
  );

  // Consolidated mixpanel tracking useEffect - fire only once
  useEffect(() => {
    if (
      !isLoading &&
      !error &&
      profile?.id &&
      mixpanel &&
      !eventsFired.current
    ) {
      eventsFired.current = true;

      // Dashboard viewed tracking
      if (profile) {
        // Track screen view for PostHog (populates the screen/URL field)
        posthog.track({
          name: '$screen',
          properties: {
            $screen_name: 'DashboardScreen',
            $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
            user_id: profile?.id,
            platform: Platform.OS,
          },
        });
        
        // Track regular events
        mixpanel.track({
          name: 'dashboard_viewed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
          },
        });
        posthog.track({
          name: 'dashboard_viewed',
          properties: {
            $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
            user_id: profile?.id,
            platform: Platform.OS,
            entry_point:'dashboard_screen'
          },
        });
      }

      // Greeting displayed tracking
      if (profile?.first_name) {
        mixpanel.track({
          name: 'greeting_displayed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            first_name: profile?.first_name,
          },
        });
          posthog.track({
          name: 'greeting_displayed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            username: profile?.first_name,
            greeting_type:getGreeting(profile?.first_name)
          },
        });

    
      }

      // Macro summary displayed tracking
      if (macros && todayProgress) {
        mixpanel.track({
          name: 'macro_summary_displayed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            calorie_target: macros.calories,
            protein_target: macros.protein,
            carbs_target: macros.carbs,
            fat_target: macros.fat,
          },
        });

        posthog.track({
          name: 'macro_summary_displayed',
          properties: {
            $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
            user_id: profile?.id,
            platform: Platform.OS,
            goal_calories:macros.calories,
            remaining_calories:remaining.calories,
            consumed_calories:todayProgress.calories,
            goal_type:'',


          },
        });
      }

      // Recently uploaded section viewed tracking
      if (loggedMeals !== undefined) {
        mixpanel.track({
          name: 'recently_uploaded_section_viewed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            meal_count: loggedMeals.length,
          },
        });

      if(loggedMeals){
        setLoggedMealsPresent(true)
      }else{
        setLoggedMealsPresent(false)
      }


        posthog.track({
          name: 'recently_uploaded_section_viewed',
          properties: {
            $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
            user_id: profile?.id,
            platform: Platform.OS,
            meal_count: loggedMeals.length,
            empty_state:loggedMealsPresent,
          },
        });
      }

     
      // Macro breakdown displayed tracking
      if (macros && todayMealsSum) {
        mixpanel.track({
          name: 'macro_breakdown_displayed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            carbs: todayMealsSum.carbs,
            carbs_goal: macros.carbs,
            fat: todayMealsSum.fat,
            fat_goal: macros.fat,
            protein: todayMealsSum.protein,
            protein_goal: macros.protein,
          },
        });
      }
        if (macros && todayMealsSum) {
        posthog.track({
          name: 'macro_breakdown_displayed',
          properties: {
            user_id: profile?.id,
            platform: Platform.OS,
            carbs: todayMealsSum.carbs,
            carbs_goal: macros.carbs,
            fat: todayMealsSum.fat,
            fat_goal: macros.fat,
            protein: todayMealsSum.protein,
            protein_goal: macros.protein,
          },
        });
      }
    }
  }, [
    isLoading,
    error,
    profile,
    macros,
    todayProgress,
    loggedMeals,
    todayMealsSum,
    mixpanel,
    posthog
  ]);

  // useEffect(() => {
  //     if (preferences.calories === 0 && preferences.protein === 0) {
  //         navigation.navigate('MacroInput');
  //     }
  // }, [preferences]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axiosInstance.get('/notifications/?status=unread');
        const data = res.data;
        const count =
          data?.pagination?.total ??
          (Array.isArray(data.results) ? data.results.length : 0);
        setUnreadCount(count);
      } catch (e) {
        console.error('Error fetching unread notifications:', e);
        setUnreadCount(0);
      }
    };
    if (isFocused) fetchUnread();
  }, [isFocused]);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // 1. Fetch user profile info
      const profileResponse = await userService.getProfile();
      
      // Identify user in PostHog only once per session
      if (!userIdentified.current && profileResponse.id) {
        userIdentified.current = true;
        posthog.identify(profileResponse.id, {
          email: profileResponse.email,
          name: profileResponse.display_name || profileResponse.first_name,
          signup_date: profileResponse.created_at || new Date().toISOString(),
          has_macros: profileResponse.has_macros,
          is_pro: profileResponse.is_pro || false,
          meal_reminder_preferences_set: profileResponse.meal_reminder_preferences_set || false,
        });
      }
      
      setStoreProfile(profileResponse);
      setProfile(profileResponse);
      // macroMealsCrashlytics.setUserAttributes({
      //   userId: profileResponse.id,
      //   email: profileResponse.email,
      //   userType: profileResponse.is_pro ? 'pro' : 'free',
      // });
      console.log('PROFILE RESPONSE', profileResponse);
      // setUsername(profileResponse.display_name || undefined);

      const prefsResponse = await userService.getPreferences();
      console.log('PREFS RESPONSE', prefsResponse);

      const macrosPreferences = {
        protein_target: prefsResponse.protein_target,
        carbs_target: prefsResponse.carbs_target,
        fat_target: prefsResponse.fat_target,
        calorie_target: prefsResponse.calorie_target,
      };

      setMacros({
        protein: prefsResponse.protein_target,
        carbs: prefsResponse.carbs_target,
        fat: prefsResponse.fat_target,
        calories: prefsResponse.calorie_target,
      });
      setMacrosPreferences(macrosPreferences);

      // macroMealsCrashlytics.triggerCrash();

      await fetchTodayProgress();

      // const totalCalories = macros.calories;
      // const progressPercentage =
      //   totalCalories > 0 ? (todayProgress.calories / totalCalories) * 100 : 0;
      // setProgress(Math.min(100, progressPercentage));

      // Refresh meals from store
      await refreshMeals();
      setIsLoading(false);
      // if (profile.is_pro === false) {
      //   navigation.navigate("PaymentScreen");
      // }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load your data. Please try again.');
      setIsLoading(false);

      // Fallback to existing preferences from the store
      // in case the API calls fail
      if (preferences) {
        setMacros({
          protein: preferences.protein || 0,
          carbs: preferences.carbs || 0,
          fat: preferences.fat || 0,
          calories: preferences.calories || 0,
        });
      }
    }
  }, [
    userId,
    token,
    preferences,
    setStoreProfile,
    setMacrosPreferences,
    fetchTodayProgress,
  ]);

  // Initial load
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // No longer need useFocusEffect since we're using state management

  const handleMacroInput = () => {
    // Do NOT call setMajorStep or setSubStep here. State should only be advanced when user completes a major step.
    navigation.navigate('GoalSetupScreen', undefined);
  };

  const handleMealLog = () => {
    mixpanel?.track({
      name: 'see_nearby_meals_clicked',
      properties: {
        user_id: profile?.id,
        platform: Platform.OS,
      },
    });
     posthog?.track({
      name: 'see_nearby_meals_clicked',
      properties: {
      $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
      $screen_name: 'DashboardScreen',
        user_id: profile?.id,
        platform: Platform.OS,
        entry_point:'dashboard_screen'
      },
    });
    mixpanel?.track({
      name: 'meal_finder_opened_from_dashboard',
      properties: {
        user_id: profile?.id,
        platform: Platform.OS,
      },
    });
      posthog?.track({
      name: 'meal_finder_opened_from_dashboard',
      properties: {
       $current_url: 'DashboardScreen', 
        $screen_name: 'DashboardScreen',
        user_id: profile?.id,
        platform: Platform.OS,
        entry_point:'dashboard',
        has_location_permission:''
      },
    });
    navigation.navigate('MealFinderScreen');
  };

  const handleAddMeal = () => {
    mixpanel?.track({
      name: 'log_first_meal_clicked',
      properties: {
        user_id: profile?.id,
        platform: Platform.OS,
      },
    });

     if(loggedMeals){
        setLoggedMealsPresent(true)
      }else{
        setLoggedMealsPresent(false)
      }

   posthog?.track({
      name: 'log_first_meal_clicked',
      properties: {
        $current_url: 'DashboardScreen', // Required for PostHog to show screen in dashboard
        $screen_name: 'dashboard',
        meals_logged_count: loggedMeals.length,
        user_id: profile?.id,
        platform: Platform.OS,
        entry_point:'dashboard_screen',
        is_first_time_user:loggedMealsPresent
      },
    });
    navigation.navigate('ScanScreenType');
  };

  const handleRefresh = () => {
    setIsLoading(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#19a28f" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remaining = {
    protein: Math.max(0, macros.protein - todayProgress.protein),
    carbs: Math.max(0, macros.carbs - todayProgress.carbs),
    fat: Math.max(0, macros.fat - todayProgress.fat),
    calories: Math.max(0, macros.calories - todayProgress.calories),
  };

  // const proteinProgress = Math.min(
  //   100,
  //   Math.round((todayProgress.protein / macros.protein) * 100) || 0
  // );
  // const carbsProgress = Math.min(
  //   100,
  //   Math.round((todayProgress.carbs / macros.carbs) * 100) || 0
  // );
  // const fatProgress = Math.min(
  //   100,
  //   Math.round((todayProgress.fat / macros.fat) * 100) || 0
  // );

  function formatDate(date: Date) {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    };
    const formattedDate = date.toLocaleDateString('en-US', options);
    const parts = formattedDate.split(', ');
    const dayOfWeek = parts[0];
    const monthAndDate = parts[1];
    const [month, day] = monthAndDate.split(' ');
    return `${dayOfWeek}, ${day} ${month}`;
  }

  function getGreeting(first_name?: string) {
    if (!first_name) {
      return 'Hello there 👋';
    }
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${first_name} 👋`;
    if (hour < 18) return `Good afternoon, ${first_name} 👋`;
    return `Good evening, ${first_name} 👋`;
    
  }

  function getTimeOfDayEmoji() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌞';
    if (hour < 18) return '⛅️';
    return '🌙';
  }

  function formatTime(timeString: string) {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <CustomSafeAreaView
      edges={['left', 'right']}
      paddingOverride={{ bottom: -25 }}
    >
      <View className="flex-1">
        <ScrollView>
          <View className="flex-1 bg-[#F5F5F5] mt-4">
            <View className="flex-row items-center justify-between px-5 pb-4 bg-white">
              <View className="flex-col items-start gap-2">
                <Text className="text-[13px] font-normal">
                  {formatDate(new Date())} {getTimeOfDayEmoji()}
                </Text>
                <Text className="text-[18px] font-medium text-black">
                  {getGreeting(profile?.first_name)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  mixpanel?.track({
                    name: 'notifications_icon_clicked',
                    properties: {
                      user_id: profile?.id,
                      platform: Platform.OS,
                      unread_count: unreadCount,
                    },
                  });
                   posthog?.track({
                    name: 'notifications_icon_clicked',
                    properties: {
                      user_id: profile?.id,
                      platform: Platform.OS,
                      unread_count: unreadCount,
                    },
                  });
                  navigation.navigate('NotificationsScreen');
                }}
              >
                <View className="relative">
                  <Image
                    source={IMAGE_CONSTANTS.notificationIcon}
                    className="w-[24px] h-[24px] object-fill"
                  />
                  {unreadCount > 0 && (
                    <View className="absolute -top-2 -right-2 bg-red-600 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                      <Text className="text-xs text-white font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
            {profile.has_macros === false ||
            profile.has_macros === undefined ? (
              <View className="flex-col bg-paleCyan px-5 py-5">
                <Image
                  tintColor={'#8BAAA3'}
                  source={IMAGE_CONSTANTS.trophy}
                  className="absolute bottom-4 tint right-4 w-[74px] h-[74px] object-fill"
                />
                <View className="relative">
                  <Text className="text-base font-semibold mb-2">
                    Set up your Macro goals
                  </Text>
                  <Text className="tracking-wide text-[13px] font-normal mb-3 mr-10">
                    Set your macro goals to get personalized tracking and
                    tailored recommendations.
                  </Text>
                  <TouchableOpacity
                    className="bg-primary w-[105px] h-[32px] rounded-[100px] justify-center items-center"
                    onPress={handleMacroInput}
                  >
                    <Text className="text-white text-sm font-semibold">
                      Set up now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <></>
            )}
            <View className="mb-6 bg-white px-5 py-6">
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-col">
                  <Text className="text-3xl text-center font-semibold -tracking-wider">
                    {remaining.calories}
                  </Text>
                  <Text className="text-sm text-textMediumGrey text-center font-medium">
                    Remaining
                  </Text>
                </View>

                <View className="h-[150px] w-[150px] relative">
                  <CircularProgress
                    size={150}
                    strokeWidth={8}
                    consumed={todayProgress.calories.toString()}
                    total={todayProgress.calories + remaining.calories}
                    color="#44A047"
                    backgroundColor="#d0e8d1"
                    label="Consumed"
                  />
                </View>

                <View className="flex-col">
                  <Text className="text-3xl text-center font-semibold -tracking-wider">
                    {macros.calories}
                  </Text>
                  <Text className="text-sm text-textMediumGrey text-center font-medium">
                    Goal
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between w-full">
                <View className="flex-col items-center justify-center">
                  <Text className="text-sm text-textMediumGrey text-center font-medium mb-1">
                    Carbs
                  </Text>
                  <LinearProgress
                    width={100}
                    progress={(todayMealsSum.carbs / macros.carbs) * 100}
                    color="#FFC107"
                  />
                  <Text className="text-sm text-textMediumGrey text-center font-medium mt-1">
                    {todayMealsSum.carbs}/{macros.carbs}g
                  </Text>
                </View>
                <View className="flex-col items-center justify-center">
                  <Text className="text-sm text-textMediumGrey text-center font-medium mb-1">
                    Fats
                  </Text>
                  <LinearProgress
                    width={100}
                    progress={(todayMealsSum.fat / macros.fat) * 100}
                    color="#FF69B4"
                  />
                  <Text className="text-sm text-textMediumGrey text-center font-medium mt-1">
                    {todayMealsSum.fat}/{macros.fat}g
                  </Text>
                </View>
                <View className="flex-col items-center justify-center">
                  <Text className="text-sm text-textMediumGrey text-center font-medium mb-1">
                    Protein
                  </Text>
                  <LinearProgress
                    width={100}
                    progress={(todayMealsSum.protein / macros.protein) * 100}
                    color="#6A5ACD"
                  />
                  <Text className="text-sm text-textMediumGrey text-center font-medium mt-1">
                    {todayMealsSum.protein}/{macros.protein}g
                  </Text>
                </View>
              </View>
            </View>
            {/* See nearby meals */}
            {profile.has_macros === true && (
              <View className="flex-row bg-lightGreen justify-between items-center rounded-md mx-5 mb-4">
                <View className="flex-1 flex-col pl-5 pr-2 py-6">
                  <Text className="text-base font-semibold">
                    Don't know what to eat?
                  </Text>
                  <Text
                    className="text-sm text-textMediumGrey font-medium"
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    Discover local meals meeting your daily macro targets
                  </Text>
                  <TouchableOpacity
                    className="bg-primary w-[144px] h-[32px] rounded-[200px] justify-center items-center mt-4"
                    onPress={handleMealLog}
                  >
                    <Text
                      allowFontScaling={false}
                      className="text-white text-sm font-semibold"
                    >
                      See nearby meals
                    </Text>
                  </TouchableOpacity>
                </View>
                <Image
                  source={IMAGE_CONSTANTS.sampleFood}
                  className="w-[133px] rounded-r-md h-full"
                  style={{ flexShrink: 0 }}
                />
              </View>
            )}

            {/* Recently uploaded */}
            <View className="flex-col bg-white px-5 py-6 mb-4">
              <Text className="text-[18px] font-semibold">
                Recently uploaded
              </Text>
              {loggedMeals.length === 0 ? (
                <View className="flex-col items-center justify-center h-[150px] mx-20">
                  <Text className="tracking-normal leading-5 text-[14px] font-medium text-center">
                    Your recently logged meals for the day will show up here
                  </Text>
                  {!hasLoggedFirstMeal(profile.email || '') && (
                    <TouchableOpacity
                      className="bg-primary w-[144px] h-[40px] rounded-[200px] justify-center items-center mt-4"
                      onPress={handleAddMeal}
                    >
                      <Text
                        allowFontScaling={false}
                        className="text-white text-sm font-semibold"
                      >
                        Log your first meal
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                loggedMeals.map((meal: any, index: number) => (
                  <View
                    key={index}
                    className="flex-row items-start px-4 mt-3 pb-2"
                  >
                    {meal.photo_url ? (
                      <ExpoImage
                        placeholder={IMAGE_CONSTANTS.blurhash}
                        cachePolicy="disk"
                        contentFit="cover"
                        transition={300}
                        source={{ uri: meal.photo_url }}
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 8,
                          marginRight: 8,
                        }}
                        onLoad={() => {
                          console.log(
                            '✅ ExpoImage loaded successfully for meal:',
                            meal.name,
                            meal.photo_url
                          );
                        }}
                        onError={(error: any) => {
                          console.log(
                            '❌ ExpoImage failed to load for meal:',
                            meal.name,
                            meal.photo_url,
                            error
                          );
                        }}
                        onLoadStart={() => {
                          console.log(
                            '🔄 ExpoImage started loading for meal:',
                            meal.name,
                            meal.photo_url
                          );
                        }}
                      />
                    ) : (
                      <Image
                        source={IMAGE_CONSTANTS.mealIcon}
                        className="w-[90px] h-[90px] object-cover rounded-lg mr-2"
                        resizeMode="cover"
                      />
                    )}
                    <View className="flex-1 flex-col">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text
                          className="text-sm text-textMediumGrey font-medium flex-1 mr-2"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {meal.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            posthog.track({
                              name:'edit_meal_clicked',
                              properties:{
                                meal_id:meal.id,
                                entry_point:'dashboard'
                              }
                            })
                            navigation.navigate('EditMealScreen', {
                              analyzedData: {
                                id: meal.id,
                                name: meal.name,
                                calories: meal.macros?.calories || 0,
                                protein: meal.macros?.protein || 0,
                                carbs: meal.macros?.carbs || 0,
                                fat: meal.macros?.fat || 0,
                                meal_type: meal.mealType || 'lunch',
                                serving_unit: meal.serving_unit || 'grams',
                                amount: meal.amount,
                                logging_mode: meal.logging_mode,
                                meal_time: meal.meal_time || meal.date,
                                photo_url: meal.photo_url,
                                read_only: meal.read_only,
                              },
                            });
                          }}
                        >
                          <View className="w-[24px] h-[24px] rounded-full justify-center items-center bg-grey">
                            <Image
                              source={IMAGE_CONSTANTS.editIcon}
                              className="w-[13px] h-[13px]"
                              tintColor="#253238"
                            />
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mb-2">
                        <Text className="text-sm text-textMediumGrey text-center font-medium mr-2">
                          {formatTime(meal.meal_time || meal.date)}
                        </Text>
                        <View className="w-[4px] h-[4px] rounded-full bg-[#253238] mr-2"></View>
                        <Image
                          tintColor="#000000"
                          source={
                            meal.logging_mode === 'manual'
                              ? IMAGE_CONSTANTS.fireIcon
                              : meal.logging_mode === 'barcode'
                                ? IMAGE_CONSTANTS.scanBarcodeIcon
                                : meal.logging_mode === 'scanned'
                                  ? IMAGE_CONSTANTS.scanMealIcon
                                  : IMAGE_CONSTANTS.fireIcon // default to fire icon
                          }
                          className="w-[12px] h-[12px] object-fill mr-1"
                        />
                        <Text className="text-sm text-textMediumGrey text-center font-medium">
                          {meal.logging_mode
                            ? meal.logging_mode.charAt(0).toUpperCase() +
                              meal.logging_mode.slice(1)
                            : 'Manual'}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center justify-center gap-1">
                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-kryptoniteGreen rounded-full">
                            <Image
                              source={IMAGE_CONSTANTS.caloriesIcon}
                              className="w-[10px] h-[10px] object-fill"
                            />
                          </View>
                          <Text className="text-xsm text-black text-center font-medium">
                            {meal.macros?.calories || 0} cal
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                            <Text className="text-white text-[10px] text-center font-medium">
                              C
                            </Text>
                          </View>
                          <Text className="text-xsm text-textMediumGrey text-center font-medium">
                            {meal.macros?.carbs || 0}g
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                            <Text className="text-white text-[10px] text-center font-medium">
                              F
                            </Text>
                          </View>
                          <Text className="text-xsm text-textMediumGrey text-center font-medium">
                            {meal.macros?.fat || 0}g
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                            <Text className="text-white text-[10px] text-center font-medium">
                              P
                            </Text>
                          </View>
                          <Text className="text-xsm text-textMediumGrey text-center font-medium">
                            {meal.macros?.protein || 0}g
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </CustomSafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#19a28f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
