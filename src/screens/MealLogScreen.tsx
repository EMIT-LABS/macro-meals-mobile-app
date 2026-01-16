import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from 'src/types/navigation';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import FavoritesService from '../services/favoritesService';
import { mealService } from '../services/mealService';
import useStore from '../store/useStore';
// import { useMixpanel } from '@macro-meals/mixpanel';

interface RouteParams {
  barcodeData: any;
  analyzedData?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
  };
}

interface RecentMeal {
  id: string;
  name: string;
  calories: number;
}

/**
 * Determines meal type based on time of day
 * @param time - The time to check
 * @returns The appropriate meal type
 */
const getMealTypeByTime = (time: Date): string => {
  const hour = time.getHours();
  if (hour >= 5 && hour < 12) return 'breakfast';
  if (hour >= 12 && hour < 18) return 'lunch';
  if (hour >= 18 && hour <= 23) return 'dinner';
  return 'other';
};

/**
 * Screen for adding a new meal to the log
 */
export const AddMealScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'AddMeal'>>();
  const route = useRoute<RouteProp<{ AddMeal: RouteParams }, 'AddMeal'>>();
  const params = route.params || {};
  const { analyzedData } = params;
  // const mixpanel = useMixpanel();

  // const trackRestaurantMealFinderUsed = async (location: string) => {
  //     if (!mixpanel) return;

  //     const signupTime = mixpanel.getSuperProperty('signup_time');
  //     const properties: Record<string, any> = {
  //         search_location: location,
  //     };

  //     const firstRestaurantSearchDone = mixpanel.getSuperProperty('first_restaurant_search_done');
  //     if (!firstRestaurantSearchDone) {
  //         const now = new Date();
  //         const timeToFirstSearch = signupTime ?
  //             (now.getTime() - new Date(signupTime).getTime()) / 1000 : 0;
  //         properties.time_to_first_restaurant_search_seconds = timeToFirstSearch;
  //         mixpanel.register({ first_restaurant_search_done: true });
  //     }

  //     mixpanel.track({
  //         name: 'restaurant_meal_finder_used',
  //         properties
  //     });
  // };

  const [mealName, setMealName] = useState<string>('');
  const [calories, setCalories] = useState<string>('0');
  const [protein, setProtein] = useState<string>('0');
  const [carbs, setCarbs] = useState<string>('0');
  const [fats, setFats] = useState<string>('0');
  // const userId = useStore((state) => state.userId);
  // const token = useStore((state) => state.token);
  const [loading, setLoading] = useState<boolean>(false);
  const [time, setTime] = useState<Date>(new Date());
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(
    getMealTypeByTime(new Date())
  );
  // const [mealDescription, setMealDescription] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [tempMealType, setTempMealType] = useState(selectedMealType);

  const [recentMeals] = useState<RecentMeal[]>([
    { id: '1', name: 'Chicken Salad', calories: 1000 },
    { id: '2', name: 'Protein Bowl', calories: 600 },
    { id: '3', name: 'Salmon Rice', calories: 800 },
  ]);

  // Initialize form with analyzed data if available
  React.useEffect(() => {
    if (analyzedData) {
      setMealName(analyzedData.name || '');
      setCalories(analyzedData.calories?.toString() || '0');
      setProtein(analyzedData.protein?.toString() || '0');
      setCarbs(analyzedData.carbs?.toString() || '0');
      setFats(analyzedData.fat?.toString() || '0');
    }
  }, [analyzedData]);

  React.useEffect(() => {
    const checkFavorite = async () => {
      if (mealName.trim()) {
        const isFav = await FavoritesService.isFavorite(mealName, 'custom');
        setIsFavorite(isFav);
      }
    };
    checkFavorite();
  }, [mealName]);

  /**
   * Handles going back to the previous screen
   */
  const handleGoBack = (): void => {
    navigation.goBack();
  };

  // /**
  //  * Handles saving the meal to bookmarks
  //  */
  // const handleBookmark = (): void => {
  //     // Implementation for bookmarking a meal
  //     console.log('Bookmark meal');
  // };

  /**
   * Quick add a recent meal
   * @param meal - The recent meal to add
   */
  const handleQuickAdd = (meal: RecentMeal): void => {
    setMealName(meal.name);
    setCalories(meal.calories.toString());
  };

  /**
   * Adds the current meal to the log
   */
  const handleAddToLog = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!mealName.trim()) {
        console.error('Please enter a meal name');
        return;
      }

      const newMeal = {
        name: mealName,
        calories: parseInt(calories, 10) || 0,
        protein: parseInt(protein, 10) || 0,
        carbs: parseInt(carbs, 10) || 0,
        fat: parseInt(fats, 10) || 0,
        meal_type: selectedMealType,
        meal_time: time.toISOString(),
        description: '',
      };

      console.log('Meal request JSON:', JSON.stringify(newMeal));
      const response = await mealService.logMeal(newMeal);
      console.log('Meal log response:', JSON.stringify(response));

      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      // Navigate back to meal log screen
      navigation.navigate('MainTabs', { screen: 'Meals' });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error adding meal to log:', error.message, error.stack);
      } else {
        try {
          console.error('Error adding meal to log:', JSON.stringify(error));
        } catch (e) {
          console.error('Error adding meal to log:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // /**
  //  * Saves the current meal as a template
  //  */
  // const handleSaveTemplate = (): void => {
  //     // Implementation for saving a meal template
  //     console.log('Save as template');
  // };

  /**
   * Handles adding a photo to the meal
   */
  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMealImage(result.assets[0].uri);
    }
  };

  // Time picker modal handlers
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) setTempTime(selectedTime);
  };
  const handleTimeCancel = () => setShowTimeModal(false);
  const handleTimeDone = () => {
    if (tempTime) setTime(tempTime);
    setShowTimeModal(false);
  };
  const formattedTime = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const toggleFavorite = async () => {
    try {
      const mealObj = {
        name: mealName,
        macros: {
          calories: parseInt(calories, 10) || 0,
          carbs: parseInt(carbs, 10) || 0,
          fat: parseInt(fats, 10) || 0,
          protein: parseInt(protein, 10) || 0,
        },
        image: mealImage || IMAGE_CONSTANTS.mealsIcon,
        restaurant: { name: 'custom', location: '' },
        serving_size: 1,
        no_of_servings: 1,
        meal_type: selectedMealType,
        meal_time: time.toISOString(),
        serving_unit: 'serving',
        logging_mode: 'manual',
        amount: 1,
        favorite: isFavorite,
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(mealObj);
      setIsFavorite(newFavoriteStatus);
      if (newFavoriteStatus) {
        Alert.alert('Added to favorites');
      } else {
        Alert.alert('Removed from favorites');
      }
    } catch {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
        <TouchableOpacity onPress={handleGoBack} className="p-1">
          <Text className="text-2xl text-[#1a1a1a]">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-[#1a1a1a]">Add Meal</Text>
        <TouchableOpacity
          onPress={toggleFavorite}
          className={`p-1 ${!mealName.trim() ? 'opacity-50' : ''}`}
          disabled={!mealName.trim()}
        >
          <Image
            source={
              isFavorite ? IMAGE_CONSTANTS.star : IMAGE_CONSTANTS.starIcon
            }
            className="w-6 h-6"
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <TouchableOpacity
          className="h-[11.3rem] rounded-xl my-4 justify-center items-center bg-[#f3f3f3]"
          onPress={handleAddPhoto}
          activeOpacity={0.8}
        >
          {mealImage ? (
            <Image
              source={{ uri: mealImage }}
              className="w-full h-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <>
              <Image
                source={IMAGE_CONSTANTS.mealsIcon}
                className="w-12 h-12 mb-2 opacity-60"
                resizeMode="contain"
              />
              <Text className="text-base text-[#8e929a]">
                Add meal photo (optional)
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View className="mb-4">
          <Text className="text-base font-medium mb-2">Meal Name</Text>
          <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
            <TextInput
              value={mealName}
              onChangeText={setMealName}
              className="flex-1 text-base"
              placeholder="Enter meal name"
              editable={!loading}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-base font-medium mb-2">Meal Type</Text>
          <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
            <TouchableOpacity
              className="flex-1 items-start justify-center h-full"
              onPress={() => {
                setTempMealType(selectedMealType);
                setShowMealTypeModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text className="text-base text-[#222]">
                {selectedMealType.charAt(0).toUpperCase() +
                  selectedMealType.slice(1)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-base font-medium text-black mb-2">
            Time of the day
          </Text>
          <TouchableOpacity
            className="border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] placeholder:text-lightGrey text-base flex-row items-center justify-between bg-white"
            onPress={() => {
              setTempTime(time);
              setShowTimeModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text className="text-base text-black">{formattedTime}</Text>
            <Image
              source={IMAGE_CONSTANTS.calendarIcon}
              className="w-6 h-6 opacity-60"
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-4">
          <View className="w-[48%]">
            <Text className="text-base font-medium text-black mb-2">
              Calories
            </Text>
            <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
              <TextInput
                className="flex-1 text-base"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                onFocus={() => {
                  if (calories === '0') setCalories('');
                }}
              />
              <Text className="text-base text-[#8e929a] ml-1">kcal</Text>
            </View>
          </View>

          <View className="w-[48%]">
            <Text className="text-base font-medium text-black mb-2">
              Protein
            </Text>
            <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
              <TextInput
                className="flex-1 text-base"
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
                placeholder="0"
                onFocus={() => {
                  if (protein === '0') setProtein('');
                }}
              />
              <Text className="text-base text-[#8e929a] ml-1">g</Text>
            </View>
          </View>
        </View>

        <View className="flex-row justify-between mb-4">
          <View className="w-[48%]">
            <Text className="text-base font-medium text-black mb-2">Carbs</Text>
            <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
              <TextInput
                className="flex-1 text-base"
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="0"
                onFocus={() => {
                  if (carbs === '0') setCarbs('');
                }}
              />
              <Text className="text-base text-[#8e929a] ml-1">g</Text>
            </View>
          </View>

          <View className="w-[48%]">
            <Text className="text-base text-black mb-2">Fats</Text>
            <View className="flex-row items-center placeholder:text-lightGrey text-base border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
              <TextInput
                className="flex-1 text-base"
                keyboardType="numeric"
                value={fats}
                onChangeText={setFats}
                placeholder="0"
                onFocus={() => {
                  if (fats === '0') setFats('');
                }}
              />
              <Text className="text-base text-[#8e929a] ml-1">g</Text>
            </View>
          </View>
        </View>

        <Text className="text-base text-black mt-3 mb-3">
          Quick add from favourites
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8"
        >
          {recentMeals.map(meal => (
            <TouchableOpacity
              key={meal.id}
              className="w-[280px] mr-4 bg-lynch rounded-xl flex-row items-center px-4 py-4"
              onPress={() => handleQuickAdd(meal)}
            >
              <Image
                source={IMAGE_CONSTANTS.mealsIcon}
                className="w-[43px] h-[43px] mr-3"
              />
              <View className="flex-1">
                <Text className="text-white font-semibold text-base mb-1">
                  {meal.name}
                </Text>
                <Text className="text-white text-xs">
                  {meal.calories} calories
                </Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
                <Text className="text-lynch text-2xl">＋</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* <TouchableOpacity
                    className="bg-[#f5f5f5] rounded-lg py-3.5 items-center mb-10"
                    onPress={handleSaveTemplate}
                >
                    <Text className="text-[#333] text-base font-medium">Save as Template</Text>
                </TouchableOpacity> */}
      </ScrollView>

      <View className="mx-5 border-t border-gray">
        <TouchableOpacity
          className={`bg-primaryLight mt-3 rounded-full py-5 items-center ${!mealName.trim() ? 'opacity-50' : ''}`}
          onPress={handleAddToLog}
          disabled={loading || !mealName.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Add to log
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={handleTimeCancel}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-xl p-4">
            <Text className="text-center text-base font-semibold mb-2">
              Select Time
            </Text>
            <DateTimePicker
              value={tempTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              style={{ alignSelf: 'center' }}
            />
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={handleTimeCancel}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTimeDone}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMealTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealTypeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View style={{ flex: 1 }} />
          <View className="bg-white rounded-t-xl p-4">
            <Text className="text-center text-base font-semibold mb-2">
              Select Meal Type
            </Text>
            <Picker
              selectedValue={tempMealType}
              onValueChange={setTempMealType}
              style={{ width: '100%' }}
              itemStyle={{ fontSize: 18, height: 180 }}
            >
              <Picker.Item label="Breakfast" value="breakfast" />
              <Picker.Item label="Lunch" value="lunch" />
              <Picker.Item label="Dinner" value="dinner" />
              <Picker.Item label="Other" value="other" />
            </Picker>
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={() => setShowMealTypeModal(false)}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedMealType(tempMealType);
                  setShowMealTypeModal(false);
                }}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddMealScreen;
