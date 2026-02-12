import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearProgress } from '../components/LinearProgress';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { RootStackParamList } from '../types/navigation';
// import { Ionicons } from '@expo/vector-icons';
import FavoritesService from '../services/favoritesService';
import { mealService } from '../services/mealService';
import { userService } from '../services/userService';
import useStore from '../store/useStore';
import { LoggingMode } from 'src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MacroData {
  label: string;
  value: number;
  total: number;
  color: string;
}

interface Meal {
  name: string;
  macros: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
  };
  image: any;
  restaurant: {
    name: string;
    location: string;
  };
  matchScore?: number;
}

const macroColors = {
  Carbs: '#FFD600',
  Fat: '#E573D7',
  Protein: '#6C5CE7',
} as const;

// type MacroColorKey = keyof typeof macroColors;

const MealFinderSearchMealBreakdownScreen: React.FC = () => {
  const route = useRoute();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'MealFinderBreakdownScreen'>
    >();
  const { meal } = route.params as { meal: Meal };
  const token = useStore(state => state.token);

  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  // const [matchPercent] = useState<number>(98);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  // const [userPreferences, setUserPreferences] = useState<any>(null);
  const [macroBreakdown, setMacroBreakdown] = useState<MacroData[]>([]);

  // Check if meal is in favorites on component mount
  useEffect(() => {
    checkIfFavorite();
    fetchUserPreferences();
  }, []);

  const checkIfFavorite = async (): Promise<void> => {
    try {
      const isInFavorites = await FavoritesService.isFavorite(
        meal.name,
        meal.restaurant.name
      );
      setIsFavorite(isInFavorites);
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const preferences = await userService.getPreferences();
      // setUserPreferences(preferences);

      // Update macro breakdown with actual user targets
      const updatedMacroBreakdown: MacroData[] = [
        {
          label: 'Carbs',
          value: meal.macros.carbs,
          total: preferences.carbs_target,
          color: macroColors.Carbs,
        },
        {
          label: 'Fat',
          value: meal.macros.fat,
          total: preferences.fat_target,
          color: macroColors.Fat,
        },
        {
          label: 'Protein',
          value: meal.macros.protein,
          total: preferences.protein_target,
          color: macroColors.Protein,
        },
      ];
      setMacroBreakdown(updatedMacroBreakdown);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Fallback to default values if preferences fetch fails
      const defaultMacroBreakdown: MacroData[] = [
        {
          label: 'Carbs',
          value: meal.macros.carbs,
          total: 50,
          color: macroColors.Carbs,
        },
        {
          label: 'Fat',
          value: meal.macros.fat,
          total: 30,
          color: macroColors.Fat,
        },
        {
          label: 'Protein',
          value: meal.macros.protein,
          total: 20,
          color: macroColors.Protein,
        },
      ];
      setMacroBreakdown(defaultMacroBreakdown);
    }
  };

  const toggleFavorite = async (): Promise<void> => {
    try {
      // Convert Meal to FavoriteMeal format
      const mealObj = {
        name: meal.name,
        macros: meal.macros,
        image: meal.image || '',
        restaurant: meal.restaurant,
        amount: 1,
        serving_size: 1,
        serving_unit: 'serving',
        no_of_servings: 1,
        meal_type: 'other',
        meal_time: new Date().toISOString(),
        logging_mode: 'meal_finder',
        favorite: isFavorite,
        matchScore: meal.matchScore,
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(mealObj);
      setIsFavorite(newFavoriteStatus);

      if (newFavoriteStatus) {
        Alert.alert('Added to favorites');
      } else {
        Alert.alert('Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleAddToLog = async (): Promise<void> => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setIsLogging(true);
    try {
      // Prepare the meal data for logging
      const mealData = {
        name: meal.name,
        calories: meal.macros.calories,
        carbs: meal.macros.carbs,
        fat: meal.macros.fat,
        protein: meal.macros.protein,
        description: `${meal.name} from ${meal.restaurant.name}`,
        meal_time: new Date().toISOString(),
        meal_type: 'lunch', // Default to lunch, could be made configurable
        logging_mode: LoggingMode.meal_finder, // Indicate this meal was logged from meal finder
      };

      console.log('Logging meal:', mealData);

      // Use the mealService to log the meal
      const loggedMeal = await mealService.logMeal(mealData);

      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      console.log('Meal logged successfully:', loggedMeal);

      Alert.alert('Success', "Meal added to today's log!", [
        {
          text: 'OK',
          onPress: () => {
            // Reset navigation stack to break out of modal context
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Meals' } }],
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error logging meal:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to add meal to log. Please try again.'
      );
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {/* Top Image */}
          <View style={{ height: SCREEN_HEIGHT * 0.4, width: '100%' }}>
            <Image
              source={IMAGE_CONSTANTS.sampleFood}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
            {/* Back and Favorite buttons */}
            <View
              style={{
                position: 'absolute',
                top: 50,
                left: 20,
                right: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Text className="text-[22px]">‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleFavorite}
                className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Image
                  source={IMAGE_CONSTANTS.starIcon}
                  className="h-[16px] w-[16px]"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Match Banner */}
          <View className="mx-5 mt-5 mb-3 rounded-lg bg-[#E3F7F5] flex-row items-center px-4 py-5">
            <Image source={IMAGE_CONSTANTS.check} className="w-5 h-5 mr-2" />
            <Text className="text-black text-sm font-medium">
              Great match, it fits your macro goals!
            </Text>
          </View>

          {/* Match Percentage - SemiCircularProgress */}
          {/* <View className="items-center my-4">
            <View
              style={{
                width: 200,
                height: 100,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SemiCircularProgress
                size={220}
                percent={meal.matchScore ? meal.matchScore / 100 : 0}
                color="#148a7d"
                backgroundColor="#E0E0E0"
                strokeWidth={14}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}
              >
                <Text className="text-[28px] font-bold mt-2 text-black">
                  {meal.matchScore ? meal.matchScore : 0}%
                </Text>
                <Text className="text-base text-[#222] font-medium">match</Text>
              </View>
            </View>
          </View> */}

          {/* Macro Breakdown Card */}
          <View
            className="mx-5 mt-7 mb-8 rounded-xl p-5"
            style={{
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Text className="text-lg font-semibold mb-5">Macro breakdown</Text>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base text-[#222] font-medium">
                Total calories
              </Text>
              <Text className="text-lg text-[#222] font-semibold">
                {meal.macros.calories} cal
              </Text>
            </View>
            {macroBreakdown.length > 0 ? (
              macroBreakdown.map((macro: MacroData) => (
                <View key={macro.label} className="mb-5">
                  <View className="flex-row items-center mb-1 justify-between">
                    <Text className="text-sm font-semibold text-[#222]">
                      {macro.label}
                    </Text>
                    <Text className="text-sm text-[#222] font-semibold">
                      {macro.value}g
                    </Text>
                    {/* <Text className="text-sm text-[#222] font-semibold">{macro.value}g / {macro.total}g</Text> */}
                  </View>
                  <LinearProgress
                    progress={(macro.value / macro.total) * 100}
                    color={macro.color}
                    height={6}
                  />
                </View>
              ))
            ) : (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#19a28f" />
                <Text className="text-sm text-[#888] mt-2">
                  Loading macro breakdown...
                </Text>
              </View>
            )}
          </View>
          <View className="mt-12 mb-1 rounded-xl p-5"></View>
        </ScrollView>

        {/* Fixed Button at Bottom */}
        <View className="absolute bottom-5 left-0 right-0 bg-white p-5 rounded-t-[20px] shadow-lg">
          <TouchableOpacity
            className="w-full h-[56px] rounded-full bg-primary items-center justify-center"
            onPress={handleAddToLog}
            disabled={isLogging}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                Add to today's log
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default MealFinderSearchMealBreakdownScreen;
