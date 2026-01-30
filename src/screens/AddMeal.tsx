import React, { useEffect, useState } from 'react';

import { useMixpanel } from '@macro-meals/mixpanel/src';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { Image as ExpoImage } from 'expo-image';
import {
  // eslint-disable-next-line react-native/split-platform-components
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { LinearProgress } from '../components/LinearProgress';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { getMeals, mealService } from '../services/mealService';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';
import { usePosthog } from '@macro-meals/posthog_service/src';
import DeviceInfo from 'react-native-device-info';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTER_OPTIONS = [
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Today', value: 'today' },
  { label: '1 week', value: '1w' },
  { label: '1 month', value: '1m' },
  { label: 'Custom', value: 'custom' },
];

function getStartEndDates(range: string): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);

  switch (range) {
    case 'today':
      break;
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      endDate.setDate(today.getDate() - 1);
      break;
    case '1w':
      startDate.setDate(today.getDate() - 6);
      break;
    case '1m':
      startDate.setMonth(today.getMonth() - 1);
      break;
    default:
      break;
  }

  // Format dates as YYYY-MM-DD with proper timezone handling
  const format = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const result = { startDate: format(startDate), endDate: format(endDate) };
  console.log('Date range for filter:', range, result);
  return result;
}

const macroData = [
  { label: 'Calories', key: 'calories', color: '#44A047' },
  { label: 'Carbs', key: 'carbs', color: '#FFC107' },
  { label: 'Fat', key: 'fat', color: '#FF69B4' },
  { label: 'Protein', key: 'protein', color: '#6A5ACD' },
] as const;

const AddMeal: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedRange, setSelectedRange] = useState('today');
  const [modalVisible, setModalVisible] = useState(false);
  const [meals, setMeals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const posthog = usePosthog();
  const [pagination, setPagination] = useState({
    has_next: false,
    has_previous: false,
    page: 0,
    page_size: 0,
    total: 0,
    total_pages: 0,
  });
  const macrosPreferences = useStore(state => state.macrosPreferences);
  const token = useStore(state => state.token);
  const deleteLoggedMeal = useStore(state => state.deleteLoggedMeal);
  const fetchTodayProgress = useStore(state => state.fetchTodayProgress);
  const mixpanel = useMixpanel();
  useEffect(() => {
    mixpanel?.track({ name: 'meals_page_viewed' });
    posthog?.track({
      name: 'meals_page_viewed',
      properties: {
        $screen_name: 'AddMeal',
        $current_url: 'AddMeal',
        platform: Platform.OS,
        app_version: DeviceInfo.getVersion(),
        selected_date: selectedRange,
        date_range_start: customRange.endDate,
        date_range_end: customRange.endDate,
        total_meals_count: meals.length,
      },
    });
  }, []);

  // State for consumed calories (same as DashboardScreen)

  // Use macrosPreferences for target values (same as DashboardScreen)
  const macros = {
    protein: macrosPreferences?.protein_target || 0,
    carbs: macrosPreferences?.carbs_target || 0,
    fat: macrosPreferences?.fat_target || 0,
    calories: macrosPreferences?.calorie_target || 0,
  };

  // Calculate total macros from meals for the selected period
  const periodMealsSum = meals.reduce(
    (acc, meal) => ({
      carbs: acc.carbs + (meal.carbs || 0),
      fat: acc.fat + (meal.fat || 0),
      protein: acc.protein + (meal.protein || 0),
      calories: acc.calories + (meal.calories || 0),
    }),
    { carbs: 0, fat: 0, protein: 0, calories: 0 }
  );

  // Calculate the difference between target and consumed calories for the selected period
  const getCaloriesDifference = () => {
    const targetCalories = macros.calories;
    const consumedCalories = periodMealsSum.calories;
    const difference = Math.max(0, targetCalories - consumedCalories);

    return difference;
  };

  const [customRange, setCustomRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [customPickerOpen, setCustomPickerOpen] = useState(false);

  // Accordion state for months and days
  const [openDays, setOpenDays] = useState<{ [month: string]: string[] }>({}); // { monthKey: [dayKey, ...] }

  // Group meals by month and day
  const mealsByMonth: { [month: string]: { [day: string]: any[] } } =
    React.useMemo(() => {
      const grouped: { [month: string]: { [day: string]: any[] } } = {};
      meals.forEach(meal => {
        const dateObj = meal.meal_time ? new Date(meal.meal_time) : new Date();
        const monthKey = format(dateObj, 'MMMM yyyy');
        const dayKey = format(dateObj, 'yyyy-MM-dd');
        if (!grouped[monthKey]) grouped[monthKey] = {};
        if (!grouped[monthKey][dayKey]) grouped[monthKey][dayKey] = [];
        grouped[monthKey][dayKey].push(meal);
      });
      return grouped;
    }, [meals]);

  useEffect(() => {
    if (meals.length > 0) {
      mixpanel?.track({
        name: 'meals_day_summary_displayed',
        properties: {
          days_displayed: Object.keys(mealsByMonth).length,
        },
      });
      posthog?.track({
        name: 'meals_day_summary_displayed',
        properties: {
          $screen_name: 'AddMeal',
          $current_url: 'AddMeal',
          days_displayed: Object.keys(mealsByMonth).length,
          remaining_calories: macros.calories - periodMealsSum,
          consumed_calories: periodMealsSum,
          goal_calories: macros.calories,
          protein_g: macros.protein,
          carbs_g: macros.carbs,
          fat_g: macros.fat,
        },
      });
    }
  }, [meals]);

  // Keep all accordions closed initially
  useEffect(() => {
    // No need to open any accordions by default
  }, [mealsByMonth]);

  // Toggle month accordion

  // Toggle day accordion
  const toggleDay = (monthKey: string, dayKey: string) => {
    setOpenDays(prev => {
      const days = prev[monthKey] || [];
      return {
        ...prev,
        [monthKey]: days.includes(dayKey)
          ? days.filter(d => d !== dayKey)
          : [...days, dayKey],
      };
    });
  };

  const fetchMeals = async (
    overrideRange?: { startDate: string; endDate: string },
    page: number = 0,
    append: boolean = false
  ) => {
    const { startDate, endDate } =
      overrideRange || getStartEndDates(selectedRange);
    console.log('Fetching meals with dates:', {
      startDate,
      endDate,
      page,
      append,
    });

    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getMeals(startDate, endDate, page);
      console.log('Meals response:', response);

      if (append) {
        setMeals(prev => [...prev, ...response.meals]);
      } else {
        setMeals(response.meals);
      }

      setPagination(response.pagination);
    } catch (e) {
      console.error('Error fetching meals:', e);
      if (!append) {
        setMeals([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMeals = async () => {
    if (pagination.has_next && !loadingMore) {
      const nextPage = pagination.page + 1;
      await fetchMeals(undefined, nextPage, true);
    }
  };

  useEffect(() => {
    if (
      selectedRange === 'custom' &&
      customRange.startDate &&
      customRange.endDate
    ) {
      // Use the same date formatting function for consistency
      const format = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const customDates = {
        startDate: format(customRange.startDate),
        endDate: format(customRange.endDate),
      };

      console.log('Custom date range:', customDates);
      fetchMeals(customDates);
    } else if (selectedRange !== 'custom') {
      fetchMeals();
    }
  }, [selectedRange, customRange]);

  // Fetch consumed data from API (same as DashboardScreen)
  useEffect(() => {
    const fetchConsumedData = async () => {
      if (!token) return;

      try {
        await mealService.getDailyProgress();
        // setConsumed({
        //   protein: progressData.logged_macros.protein,
        //   carbs: progressData.logged_macros.carbs,
        //   fat: progressData.logged_macros.fat,
        //   calories: progressData.logged_macros.calories,
        // });
      } catch (error) {
        console.error('Error fetching consumed data:', error);
      }
    };

    fetchConsumedData();
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeals();
    setRefreshing(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      'Delete log',
      'This action cannot be undone and will adjust your remaining macro calculations and progress metrics.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await mealService.deleteMeal(mealId);
              mixpanel?.track({
                name: 'meal_deleted',
                properties: { meal_id: mealId, selected_date: selectedRange },
              });
              posthog?.track({
                name: 'meal_deleted',

                properties: {
                  meal_id: mealId,
                  selected_date: selectedRange,
                  $screen_name: 'AddMeal',
                  $current_url: 'AddMeal',
                },
              });
              // Remove meal from store immediately
              deleteLoggedMeal(mealId);
              // Refresh the meals list
              fetchMeals();
              // Refresh Dashboard progress data behind the scenes
              try {
                await fetchTodayProgress();
              } catch (progressError) {
                console.error('Error refreshing progress data:', progressError);
              }
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Group meals by mealType
  const mealSections = [
    {
      key: 'breakfast',
      emoji: '☀️',
      label: 'Breakfast',
      meals: meals.filter(m => m.meal_type === 'breakfast'),
    },
    {
      key: 'lunch',
      emoji: '🥗',
      label: 'Lunch',
      meals: meals.filter(m => m.meal_type === 'lunch'),
    },
    {
      key: 'dinner',
      emoji: '🍽️',
      label: 'Dinner',
      meals: meals.filter(m => m.meal_type === 'dinner'),
    },
  ].filter(section => section.meals.length > 0); // Only show sections that have meals

  const showFilterSheet = () => {
    mixpanel?.track({ name: 'meals_filter_icon_clicked' });

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Filter your meals',
          message: 'Select a time frame to view your meals over time.',
          options: [
            'Today',
            'Yesterday',
            '1 week',
            '1 month',
            'Custom',
            'Cancel',
          ],
          cancelButtonIndex: 5,
          destructiveButtonIndex: undefined,
        },
        buttonIndex => {
          if (buttonIndex === 0) setSelectedRange('today');
          else if (buttonIndex === 1) setSelectedRange('yesterday');
          else if (buttonIndex === 2) setSelectedRange('1w');
          else if (buttonIndex === 3) setSelectedRange('1m');
          else if (buttonIndex === 4) {
            setSelectedRange('custom');
            setCustomPickerOpen(true);
          }
          // Cancel does nothing
        }
      );
      posthog?.track({
        name: 'meals_filter_icon_clicked',
        properties: {
          $screen_name: 'AddMeal',
          $current_url: 'AddMeal',
          current_view_period: selectedRange,
          current_selected_date: selectedRange,
          total_meals_count: meals.length,
          entry_point: 'meal_screen',
        },
      });
    } else {
      setModalVisible(true); // fallback to your custom modal for Android
    }
  };

  return (
    <PaperProvider>
      <View className="flex-1 bg-[#F5F5F5]">
        {/* Top section: Range/filter and progress bars in one column */}
        <View
          className={`bg-primaryLight px-4 pb-6 mb-4 ${Platform.OS === 'ios' ? 'pt-[60px]' : 'pt-[0px]'}`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1"></View>

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  const currentIndex = FILTER_OPTIONS.findIndex(
                    opt => opt.value === selectedRange
                  );
                  const prevIndex =
                    currentIndex > 0
                      ? currentIndex - 1
                      : FILTER_OPTIONS.length - 1;
                  const newRange = FILTER_OPTIONS[prevIndex].value;
                  setSelectedRange(newRange);
                  if (newRange === 'custom') {
                    mixpanel?.track({
                      name: 'custom_date_picker_opened',
                      properties: {
                        current_view_period: selectedRange,
                        prefilled_start_date: customRange.startDate,
                        prefilled_end_date: customRange.endDate,
                        entry_point: 'meals_page',
                      },
                    });
                    posthog?.track({
                      name: 'custom_date_picker_opened',
                      properties: {
                        $screen_name: 'AddMeal',
                        $current_url: 'AddMeal',
                        current_view_period: selectedRange,
                        prefilled_start_date: customRange.startDate,
                        prefilled_end_date: customRange.endDate,
                        entry_point: 'meals_page',
                      },
                    });
                    posthog.track({
                      name: 'meals_period_navigated',
                      properties: {
                        $screen_name: 'AddMeal',
                        $current_url: 'AddMeal',
                        from_period: prevIndex,
                        to_period: currentIndex,
                        direction: 'backward',
                        from_date: selectedRange,
                        to_date: newRange,
                      },
                    });
                    setCustomPickerOpen(true);
                  }
                }}
              >
                <Text className="text-white text-2xl font-bold">‹</Text>
              </TouchableOpacity>

              <Text className="text-white text-lg font-semibold mx-4">
                {FILTER_OPTIONS.find(opt => opt.value === selectedRange)
                  ?.label || 'Today'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const currentIndex = FILTER_OPTIONS.findIndex(
                    opt => opt.value === selectedRange
                  );
                  const nextIndex =
                    currentIndex < FILTER_OPTIONS.length - 1
                      ? currentIndex + 1
                      : 0;
                  const newRange = FILTER_OPTIONS[nextIndex].value;
                  setSelectedRange(newRange);
                  if (newRange === 'custom') {
                    setCustomPickerOpen(true);
                  }
                  posthog.track({
                    name: 'meals_period_navigated',
                    properties: {
                      $screen_name: 'AddMeal',
                      $current_url: 'AddMeal',
                      from_period: currentIndex,
                      to_period: nextIndex,
                      direction: 'forward',
                      from_date: selectedRange,
                      to_date: newRange,
                    },
                  });
                }}
              >
                <Text className="text-white text-2xl font-bold">›</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 items-end">
              <TouchableOpacity onPress={showFilterSheet}>
                <Image
                  source={IMAGE_CONSTANTS.filterIcon}
                  className="w-7 h-7"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Macros Progress Section */}
          <View className="bg-white/20 rounded-2xl mt-3 px-4 py-4">
            <View className="flex-row items-center justify-start mb-3">
              <Text className="text-white text-base font-medium">
                Calories remaining ({getCaloriesDifference()})
              </Text>
            </View>
            <View className="flex-row items-center justify-between w-full">
              {macroData.map(macro => (
                <View
                  key={macro.label}
                  className="flex-col items-center justify-center"
                >
                  <Text className="text-white text-[11px] font-medium mb-1">
                    {macro.key === 'calories'
                      ? `${periodMealsSum.calories}/${macros.calories}`
                      : `${periodMealsSum[macro.key]}/${macros[macro.key]}`}
                  </Text>
                  <LinearProgress
                    width={78}
                    progress={
                      macro.key === 'calories'
                        ? (periodMealsSum.calories / (macros.calories || 1)) *
                          100
                        : (periodMealsSum[macro.key] /
                            (macros[macro.key] || 1)) *
                          100
                    }
                    color={macro.color}
                    backgroundColor="#E5E5E5"
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Meals List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#7E54D9']}
              tintColor="#7E54D9"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const paddingToBottom = 20;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - paddingToBottom
            ) {
              loadMoreMeals();
            }
          }}
          scrollEventThrottle={400}
        >
          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#19a28f" />
              <Text className="text-textMediumGrey mt-4">Loading meals...</Text>
            </View>
          ) : // Show accordion UI only for custom filter
          selectedRange === 'custom' ? (
            Object.keys(mealsByMonth).length === 0 ? (
              <View className="flex-1 w-full py-1">
                <Text className="text-textMediumGrey text-center">
                  You haven't logged any meals yet.
                </Text>
                <TouchableOpacity
                  className="mt-4 py-2 px-4 border-t border-gray"
                  onPress={() => {
                    const defaultDate = new Date();
                    if ((selectedRange as string) === 'yesterday') {
                      defaultDate.setDate(defaultDate.getDate() - 1);
                    }
                    navigation.navigate('ScanScreenType');
                  }}
                >
                  <Text className="text-primary font-semibold">+ ADD FOOD</Text>
                </TouchableOpacity>
              </View>
            ) : (
              Object.entries(mealsByMonth).map(([monthKey, daysObj]) =>
                Object.entries(daysObj).map(([dayKey, dayMeals]) => {
                  // Calculate summary for the day
                  const summary = dayMeals.reduce(
                    (acc, meal) => {
                      acc.calories += meal.calories || 0;
                      acc.carbs += meal.carbs || 0;
                      acc.fat += meal.fat || 0;
                      acc.protein += meal.protein || 0;
                      return acc;
                    },
                    { calories: 0, carbs: 0, fat: 0, protein: 0 }
                  );

                  return (
                    <View
                      key={dayKey}
                      className="mb-4 bg-white rounded-xl overflow-hidden"
                    >
                      {/* Day Accordion Header */}
                      <TouchableOpacity
                        className="flex-row items-center justify-between px-4 py-4 bg-white"
                        onPress={() => toggleDay(monthKey, dayKey)}
                      >
                        <View className="flex-1">
                          <Text className="text-base font-semibold">
                            {format(parseISO(dayKey), 'MMM d, yyyy')} (
                            {dayMeals.length} meals)
                          </Text>
                          {/* Day Summary with Icons */}
                          <View className="flex-row items-center gap-3 mt-2">
                            <View className="flex-row items-center justify-center gap-1">
                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-kryptoniteGreen rounded-full">
                                <Image
                                  source={IMAGE_CONSTANTS.caloriesIcon}
                                  className="w-[10px] h-[10px] object-fill"
                                />
                              </View>
                              <Text className="text-xs text-black font-medium">
                                {summary.calories} cal
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                                <Text className="text-white text-[10px] text-center font-medium">
                                  C
                                </Text>
                              </View>
                              <Text className="text-xs text-textMediumGrey font-medium">
                                {summary.carbs}g
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                                <Text className="text-white text-[10px] text-center font-medium">
                                  F
                                </Text>
                              </View>
                              <Text className="text-xs text-textMediumGrey font-medium">
                                {summary.fat}g
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                                <Text className="text-white text-[10px] text-center font-medium">
                                  P
                                </Text>
                              </View>
                              <Text className="text-xs text-textMediumGrey font-medium">
                                {summary.protein}g
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View>
                          <Image
                            source={
                              openDays[monthKey]?.includes(dayKey)
                                ? IMAGE_CONSTANTS.chevronUpIcon
                                : IMAGE_CONSTANTS.chevronDownIcon
                            }
                            className="w-[12px] h-[12px] object-fill"
                          />
                        </View>
                        {/* <Text className="text-2xl text-primaryLight ml-4">{openDays[monthKey]?.includes(dayKey) ? '˄' : '˅'}</Text> */}
                      </TouchableOpacity>
                      {/* Day Accordion Content */}
                      {openDays[monthKey]?.includes(dayKey) && (
                        <View className="bg-[#F5F5F5] pb-2">
                          <View className="bg-white py-3">
                            {['breakfast', 'lunch', 'dinner'].map(
                              (type, idx) => {
                                const sectionMeals = dayMeals.filter(
                                  m => m.meal_type === type
                                );
                                if (sectionMeals.length === 0) return null;
                                const section = {
                                  key: type,
                                  emoji:
                                    type === 'breakfast'
                                      ? '☀️'
                                      : type === 'lunch'
                                        ? '🥗'
                                        : '🍽️',
                                  label:
                                    type.charAt(0).toUpperCase() +
                                    type.slice(1),
                                  meals: sectionMeals,
                                };
                                return (
                                  <React.Fragment key={section.key}>
                                    {idx > 1 && (
                                      <View className="h-px bg-lightGrey mx-4 my-3" />
                                    )}
                                    {/* Section Header inside the card */}
                                    {section.meals.length > 0 && (
                                      <View className="flex-row items-center px-4 mt-1">
                                        <Text className="text-lg font-semibold">
                                          {section.emoji} {section.label}
                                        </Text>
                                      </View>
                                    )}
                                    {section.meals.map((meal, index) => (
                                      <View
                                        key={index}
                                        className="flex-row items-start px-4 mt-3 pb-2"
                                      >
                                        {meal.photo_url ? (
                                          <ExpoImage
                                            placeholder={
                                              IMAGE_CONSTANTS.blurhash
                                            }
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
                                            <View className="flex-row items-center gap-3">
                                              <TouchableOpacity
                                                onPress={() => {
                                                  mixpanel?.track({
                                                    name: 'edit_meal_from_meals_clicked',
                                                    properties: {
                                                      meal_id: meal.id,
                                                      selected_date:
                                                        meal.meal_time,
                                                    },
                                                  });
                                                  posthog?.track({
                                                    name: 'edit_meal_from_meals_clicked',
                                                    properties: {
                                                      $screen_name: 'AddMeal',
                                                      $current_url: 'AddMeal',
                                                      meal_id: meal.id,
                                                      selected_date:
                                                        meal.meal_time,
                                                    },
                                                  });
                                                  navigation.navigate(
                                                    'EditMealScreen',
                                                    {
                                                      analyzedData: {
                                                        id: meal.id,
                                                        name: meal.name,
                                                        calories: meal.calories,
                                                        protein: meal.protein,
                                                        carbs: meal.carbs,
                                                        fat: meal.fat,
                                                        amount:
                                                          meal.amount || 1,
                                                        meal_type:
                                                          meal.meal_type,
                                                        serving_unit:
                                                          meal.serving_unit,
                                                        logging_mode:
                                                          meal.logging_mode,
                                                        meal_time:
                                                          meal.meal_time,
                                                        photo_url:
                                                          meal.photo_url,
                                                        read_only:
                                                          meal.read_only,
                                                      },
                                                    }
                                                  );
                                                }}
                                              >
                                                <View className="w-[24px] h-[24px] bg-gray rounded-full justify-center items-center bg-gray-100">
                                                  <Image
                                                    source={
                                                      IMAGE_CONSTANTS.editIcon
                                                    }
                                                    className="w-[13px] h-[13px]"
                                                    tintColor="#253238"
                                                  />
                                                </View>
                                              </TouchableOpacity>
                                              <TouchableOpacity
                                                onPress={() =>
                                                  handleDeleteMeal(meal.id)
                                                }
                                              >
                                                <View className="w-[24px] h-[24px] rounded-full bg-gray justify-center items-center bg-gray-100">
                                                  <Image
                                                    source={
                                                      IMAGE_CONSTANTS.deleteIcon
                                                    }
                                                    className="w-[11px] h-[13px]"
                                                    tintColor="#253238"
                                                  />
                                                </View>
                                              </TouchableOpacity>
                                            </View>
                                          </View>
                                          <View className="flex-row items-center mb-2">
                                            <Text className="text-sm text-textMediumGrey text-center font-medium mr-2">
                                              {meal.meal_time
                                                ? (() => {
                                                    const date = new Date(
                                                      meal.meal_time
                                                    );
                                                    const range =
                                                      selectedRange as string;
                                                    if (
                                                      range === '1w' ||
                                                      range === '1m'
                                                    ) {
                                                      return date.toLocaleDateString(
                                                        [],
                                                        {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      );
                                                    } else {
                                                      return date.toLocaleTimeString(
                                                        [],
                                                        {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      );
                                                    }
                                                  })()
                                                : 'N/A'}
                                            </Text>
                                            <View className="w-[4px] h-[4px] rounded-full bg-[#253238] mr-2"></View>
                                            <Image
                                              tintColor="#000000"
                                              source={
                                                meal.logging_mode === 'manual'
                                                  ? IMAGE_CONSTANTS.fireIcon
                                                  : meal.logging_mode ===
                                                      'barcode'
                                                    ? IMAGE_CONSTANTS.scanBarcodeIcon
                                                    : meal.logging_mode ===
                                                        'scanned'
                                                      ? IMAGE_CONSTANTS.scanMealIcon
                                                      : IMAGE_CONSTANTS.fireIcon // default to fire icon
                                              }
                                              className="w-[12px] h-[12px] object-fill mr-1"
                                            />
                                            <Text className="text-sm text-textMediumGrey text-center font-medium">
                                              {meal.logging_mode
                                                ? meal.logging_mode
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                  meal.logging_mode.slice(1)
                                                : 'Manual'}
                                            </Text>
                                          </View>
                                          <View className="flex-row items-center gap-3">
                                            <View className="flex-row items-center justify-center gap-1">
                                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-kryptoniteGreen rounded-full">
                                                <Image
                                                  source={
                                                    IMAGE_CONSTANTS.caloriesIcon
                                                  }
                                                  className="w-[10px] h-[10px] object-fill"
                                                />
                                              </View>
                                              <Text className="text-xsm text-black text-center font-medium">
                                                {meal.calories} cal
                                              </Text>
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                                                <Text className="text-white text-[10px] text-center font-medium">
                                                  C
                                                </Text>
                                              </View>
                                              <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                                {meal.carbs}g
                                              </Text>
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                                                <Text className="text-white text-[10px] text-center font-medium">
                                                  F
                                                </Text>
                                              </View>
                                              <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                                {meal.fat}g
                                              </Text>
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                              <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                                                <Text className="text-white text-[10px] text-center font-medium">
                                                  P
                                                </Text>
                                              </View>
                                              <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                                {meal.protein}g
                                              </Text>
                                            </View>
                                          </View>
                                        </View>
                                      </View>
                                    ))}
                                  </React.Fragment>
                                );
                              }
                            )}
                            {/* Add Food Button for this day (only one per day, inside the card) */}
                            <TouchableOpacity
                              className="py-4 px-4 border-t border-gray"
                              onPress={() => {
                                navigation.navigate('ScanScreenType');
                              }}
                            >
                              <Text className="text-primary font-semibold">
                                + ADD FOOD
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {/* Add vertical separation between sections */}
                          <View className="h-6 bg-[#F5F5F5]"></View>
                        </View>
                      )}
                    </View>
                  );
                })
              )
            )
          ) : (
            // Show original meal list UI for non-custom filters
            <>
              {/* Single Meals Card - Full Width */}
              <View className="bg-white py-3">
                {mealSections.length === 0 ? (
                  <View className="flex-1 w-full py-1">
                    <Text className="text-textMediumGrey text-center">
                      You haven't logged any meals yet.
                    </Text>
                    <TouchableOpacity
                      className="mt-4 py-2 px-4 border-t border-gray"
                      onPress={() => {
                        const defaultDate = new Date();
                        if (selectedRange === 'yesterday') {
                          defaultDate.setDate(defaultDate.getDate() - 1);
                        }
                        navigation.navigate('ScanScreenType');
                      }}
                    >
                      <Text className="text-primary font-semibold">
                        + ADD FOOD
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  mealSections.map((section, sectionIndex) => (
                    <View key={section.key}>
                      {/* Section Header inside the card */}
                      {section.meals.length > 0 && (
                        <View className="flex-row items-center mb-3 px-4 mt-3">
                          <Text className="text-lg font-semibold">
                            {section.emoji} {section.label}
                          </Text>
                        </View>
                      )}
                      {section.meals.map((meal, index) => (
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
                              <View className="flex-row items-center gap-3">
                                <TouchableOpacity
                                  onPress={() => {
                                    navigation.navigate('EditMealScreen', {
                                      analyzedData: {
                                        id: meal.id,
                                        name: meal.name,
                                        calories: meal.calories,
                                        protein: meal.protein,
                                        carbs: meal.carbs,
                                        fat: meal.fat,
                                        amount: meal.amount || 1,
                                        meal_type: meal.meal_type,
                                        serving_unit: meal.serving_unit,
                                        logging_mode: meal.logging_mode,
                                        meal_time: meal.meal_time,
                                        photo_url: meal.photo_url,
                                        read_only: meal.read_only,
                                      },
                                    });
                                  }}
                                >
                                  <View className="w-[24px] h-[24px] bg-gray rounded-full justify-center items-center bg-gray-100">
                                    <Image
                                      source={IMAGE_CONSTANTS.editIcon}
                                      className="w-[13px] h-[13px]"
                                      tintColor="#253238"
                                    />
                                  </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeleteMeal(meal.id)}
                                >
                                  <View className="w-[24px] h-[24px] rounded-full bg-gray justify-center items-center bg-gray-100">
                                    <Image
                                      source={IMAGE_CONSTANTS.deleteIcon}
                                      className="w-[11px] h-[13px]"
                                      tintColor="#253238"
                                    />
                                  </View>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View className="flex-row items-center mb-2">
                              <Text className="text-sm text-textMediumGrey text-center font-medium mr-2">
                                {meal.meal_time
                                  ? (() => {
                                      const date = new Date(meal.meal_time);
                                      if (
                                        selectedRange === '1w' ||
                                        selectedRange === '1m'
                                      ) {
                                        return date.toLocaleDateString([], {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        });
                                      } else {
                                        return date.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        });
                                      }
                                    })()
                                  : 'N/A'}
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
                                  {meal.calories} cal
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                                  <Text className="text-white text-[10px] text-center font-medium">
                                    C
                                  </Text>
                                </View>
                                <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                  {meal.carbs}g
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                                  <Text className="text-white text-[10px] text-center font-medium">
                                    F
                                  </Text>
                                </View>
                                <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                  {meal.fat}g
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-1">
                                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                                  <Text className="text-white text-[10px] text-center font-medium">
                                    P
                                  </Text>
                                </View>
                                <Text className="text-xsm text-textMediumGrey text-center font-medium">
                                  {meal.protein}g
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                      {/* Add Food Button for this section */}
                      <TouchableOpacity
                        className="mt-4 py-4 px-4 border-t border-gray"
                        onPress={() => {
                          const defaultDate = new Date();
                          if (selectedRange === 'yesterday') {
                            defaultDate.setDate(defaultDate.getDate() - 1);
                          }
                          navigation.navigate('ScanScreenType');
                        }}
                      >
                        <Text className="text-primary font-semibold">
                          + ADD FOOD
                        </Text>
                      </TouchableOpacity>
                      {/* Add vertical separation between sections */}
                      {sectionIndex < mealSections.length - 1 &&
                        section.meals.length > 0 && (
                          <View className="h-6 bg-[#F5F5F5]"></View>
                        )}
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* Loading more indicator */}
          {loadingMore && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#19a28f" />
              <Text className="text-textMediumGrey mt-2">
                Loading more meals...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Filter Modal */}
        {Platform.OS !== 'ios' && (
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/40">
              <View className="bg-[#F5F5F5] rounded-t-2xl p-4 mx-2 mb-4">
                <Text className="text-center text-base font-bold mb-1">
                  Filter your meals
                </Text>
                <Text className="text-center text-xs mb-4">
                  Select a time frame to view your meals over time.
                </Text>
                {FILTER_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    className="py-3 border-b border-gray-200"
                    onPress={() => {
                      setSelectedRange(opt.value);
                      setModalVisible(false);
                      if (opt.value === 'custom') {
                        // Delay opening the date picker to allow the filter modal to close first
                        setTimeout(() => {
                          setCustomPickerOpen(true);
                        }, 300);
                      }
                    }}
                  >
                    <Text className="text-center text-lg text-blue-600 font-medium">
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  className="py-3 mt-2"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-center text-lg text-blue-600 font-bold">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
      {/* Date Range Picker Modal for Custom filter */}
      <DatePickerModal
        locale="en"
        mode="range"
        visible={customPickerOpen}
        onDismiss={() => setCustomPickerOpen(false)}
        startDate={customRange.startDate}
        endDate={customRange.endDate}
        onConfirm={({ startDate, endDate }) => {
          setCustomPickerOpen(false);
          setCustomRange({ startDate, endDate });
          mixpanel?.track({
            name: 'custom_date_range_selected',
            properties: {
              date_range_start: startDate?.toISOString() ?? null,
              date_range_end: endDate?.toISOString() ?? null,
              total_days:
                startDate && endDate
                  ? Math.ceil(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1
                  : null,
            },
          });
          posthog?.track({
            name: 'custom_date_range_selected',
            properties: {
              $screen_name: 'AddMeal',
              $current_url: 'AddMeal',
              date_range_start: startDate?.toISOString() ?? null,
              date_range_end: endDate?.toISOString() ?? null,
              total_days:
                startDate && endDate
                  ? Math.ceil(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1
                  : null,
            },
          });
        }}
        validRange={{ endDate: new Date() }}
      />
    </PaperProvider>
  );
};

export default AddMeal;
