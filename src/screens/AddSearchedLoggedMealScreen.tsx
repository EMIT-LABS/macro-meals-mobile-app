import { useMixpanel } from '@macro-meals/mixpanel';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

interface RouteParams {
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
  defaultDate?: string;
}

import { SERVING_UNITS } from 'constants/serving_units';
import { FavouriteIcon } from 'src/components/FavouriteIcon';
import { FavoriteMeal } from '../services/favoritesService';
import { usePosthog } from '@macro-meals/posthog_service/src';

/**
 * Screen for adding a searched meal to the log with macro calculations
 */
export const AddSearchedLoggedMealScreen: React.FC = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<RootStackParamList, 'AddSearchedLoggedMeal'>
    >();
  const route =
    useRoute<
      RouteProp<{ AddSearchedLoggedMeal: RouteParams }, 'AddSearchedLoggedMeal'>
    >();
  const params = route.params || {};
  const { searchedMeal, defaultDate } = params;

  const [mealName, setMealName] = useState<string>('');
  const [calories, setCalories] = useState<string>('0');
  const [protein, setProtein] = useState<string>('0');
  const [carbs, setCarbs] = useState<string>('0');
  const [fats, setFats] = useState<string>('0');
  const [baseAmount, setBaseAmount] = useState<number>(100); // Base amount from API
  const [newAmount, setNewAmount] = useState<string>('100'); // User input amount
  const [originalCalories, setOriginalCalories] = useState<number>(0);
  const [originalProtein, setOriginalProtein] = useState<number>(0);
  const [originalCarbs, setOriginalCarbs] = useState<number>(0);
  const [originalFats, setOriginalFats] = useState<number>(0);
  // const userId = useStore((state) => state.userId);
  // const token = useStore((state) => state.token);
  const [loading, setLoading] = useState<boolean>(false);
  const [time, setTime] = useState<Date>(new Date());
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [servingUnit, setServingUnit] = useState<string>('g');
  const [noOfServings, setNoOfServings] = useState<string>('1');
  const [showServingUnitModal, setShowServingUnitModal] = useState(false);
  const [tempServingUnit, setTempServingUnit] = useState('g');
  const [isFavorite, setIsFavorite] = useState(false);
  const [mealDescription, setMealDescription] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [tempMealType, setTempMealType] = useState('breakfast');
  // const [mealType, setMealType] = useState('breakfast');
  const [favoriteMeals, setFavoriteMeals] = useState<FavoriteMeal[]>([]);
  // const [loadingFavorites, setLoadingFavorites] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const mixpanel = useMixpanel();
  const posthog = usePosthog()

  // Initialize form with searched meal data
  React.useEffect(() => {
    if (searchedMeal) {
      setMealName(searchedMeal.name || '');
      setBaseAmount(searchedMeal.amount || 100);
      setNewAmount(searchedMeal.amount?.toString() || '100');
      setServingUnit(searchedMeal.serving_unit || 'g');
      setTempServingUnit(searchedMeal.serving_unit || 'g');
      setMealDescription(searchedMeal.description || '');
      setIsReadOnly(searchedMeal.read_only || false);

      // Store original values for calculations
      setOriginalCalories(searchedMeal.calories || 0);
      setOriginalProtein(searchedMeal.protein || 0);
      setOriginalCarbs(searchedMeal.carbs || 0);
      setOriginalFats(searchedMeal.fat || 0);

      // Set initial calculated values
      setCalories(searchedMeal.calories?.toString() || '0');
      setProtein(searchedMeal.protein?.toString() || '0');
      setCarbs(searchedMeal.carbs?.toString() || '0');
      setFats(searchedMeal.fat?.toString() || '0');

      if (searchedMeal.photo_url) {
        setMealImage(searchedMeal.photo_url);
      }
    }
  }, [searchedMeal]);

  // Calculate macros when new amount changes
  useEffect(() => {
    if (baseAmount > 0 && newAmount && originalCalories > 0) {
      const multiplier = parseFloat(newAmount) / baseAmount;

      const calculated_calories =
        Math.round(originalCalories * multiplier * 100) / 100;
      const calculated_protein =
        Math.round(originalProtein * multiplier * 100) / 100;
      const calculated_carbs =
        Math.round(originalCarbs * multiplier * 100) / 100;
      const calculated_fat = Math.round(originalFats * multiplier * 100) / 100;

      setCalories(calculated_calories.toString());
      setProtein(calculated_protein.toString());
      setCarbs(calculated_carbs.toString());
      setFats(calculated_fat.toString());
    }
  }, [
    newAmount,
    baseAmount,
    originalCalories,
    originalProtein,
    originalCarbs,
    originalFats,
  ]);

  React.useEffect(() => {
    const checkFavorite = async () => {
      if (mealName.trim()) {
        const isFav = await FavoritesService.isFavorite(mealName, 'custom');
        setIsFavorite(isFav);
      }
    };
    checkFavorite();
  }, [mealName]);

  // Fetch favorite meals on component mount
  useEffect(() => {
    const fetchFavorites = async () => {
      // setLoadingFavorites(true);
      try {
        const favorites = await FavoritesService.getFavorites();
        setFavoriteMeals(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        // setLoadingFavorites(false);
      }
    };
    fetchFavorites();
  }, []);

  /**
   * Handles going back to the previous screen
   */
  const handleGoBack = (): void => {
    navigation.goBack();
  };

  /**
   * Quick add a favorite meal
   * @param meal - The favorite meal to add
   */
  const handleQuickAdd = (meal: FavoriteMeal): void => {
    setMealName(meal.name);
    setCalories(meal.macros.calories.toString());
    setProtein(meal.macros.protein.toString());
    setCarbs(meal.macros.carbs.toString());
    setNoOfServings(meal.no_of_servings.toString());
    setFats(meal.macros.fat.toString());
    posthog.track({
      name:'favorites_quick_add_used_from_search',
      properties:{
        favourite_meal_id:meal.id,
        replacing_existing:searchedMeal.name
      }
    })

  };

  /**
   * Adds the current meal to the log
   */
  const handleSubmitMealLog = async (): Promise<void> => {
      if (defaultDate) {
          const defaultDateValue = defaultDate.split('T')[0]; 
          const currentDateValue = new Date().toISOString().split('T')[0]; 
          
          if (defaultDateValue === currentDateValue) {
              const defaultTimeString = new Date(defaultDate).toLocaleTimeString('en-US', { hour12: false });
              const [defaultHours, defaultMinutes] = defaultTimeString.split(':');
              const defaultTimeFormatted = `${defaultHours}:${defaultMinutes}`;
              const currentTimeISO = time.toISOString();
              const currentTimeString = currentTimeISO.split('T')[1]; 
              const [currentHours, currentMinutes] = currentTimeString.split(':');
              const currentTimeFormatted = `${currentHours}:${currentMinutes}`;
  
              if (defaultTimeFormatted < currentTimeFormatted) {
                  Alert.alert('Error', 'You can’t log a meal for a future time today.');
                  setLoading(false);
                  const currentDateValue = new Date();
                  setTime(currentDateValue);
                  return;
              }
          }
      }
  
      handleAddMealLog();
  };
    const handleAddMealLog = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!mealName.trim()) {
        console.error('Please enter a meal name');
        return;
      }

      // Ensure amount is at least 1 and is an integer
      const amount = Math.max(1, parseInt(noOfServings) || 1);

      // Calculate adjusted macros based on amount
      const adjustedMacros = {
        calories: Math.round((parseFloat(calories) || 0) * amount),
        protein: Math.round((parseFloat(protein) || 0) * amount),
        carbs: Math.round((parseFloat(carbs) || 0) * amount),
        fat: Math.round((parseFloat(fats) || 0) * amount),
      };

      // Create the meal request object that matches LogMealRequest interface
      const mealRequest = {
        name: mealName,
        calories: adjustedMacros.calories,
        protein: adjustedMacros.protein,
        carbs: adjustedMacros.carbs,
        fat: adjustedMacros.fat,
        amount: amount,
        meal_type: tempMealType,
        meal_time: time.toISOString(),
        serving_size: servingUnit,
        description: mealDescription || undefined,
        photo: mealImage
          ? {
              uri: mealImage,
              type: 'image/jpeg',
              name: 'meal_photo.jpg',
            }
          : undefined,
      };

      // Log the request data for debugging
      console.log(
        'Add Searched Meal request data:',
        JSON.stringify(mealRequest, null, 2)
      );

      // Send the request
      await mealService.logMeal(mealRequest);

      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      // Track meal logging
      mixpanel?.track({
        name: 'meal_logged',
        properties: {
          method: 'searched',
          meal_type: tempMealType,
          amount: amount,
          serving_size: servingUnit,
          ...adjustedMacros,
        },
      });
      posthog?.track({
        name: 'add_to_log_from_search_submitted',
        properties: {
          method: 'searched',
          meal_id:mealName,
          meal_type: tempMealType,
          amount: amount,
          serving_size: servingUnit,
          ...adjustedMacros,
        },
      });

      navigation.navigate('MainTabs', { screen: 'Meals' });
    } catch (error) {
      console.error('Error adding searched meal:', error);
      Alert.alert('Error', 'Failed to add meal');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles adding a photo to the meal
   */
  const handleAddPhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll access to add photos to your meals.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMealImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'There was a problem selecting the image. Please try again.',
        [{ text: 'OK' }]
      );
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
      if (!mealName.trim()) {
        Alert.alert('Please enter a meal name');
        return;
      }
      const mealObj = {
        name: mealName,
        macros: {
          calories: parseFloat(calories) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fats) || 0,
          protein: parseFloat(protein) || 0,
        },
        serving_size: parseInt(noOfServings, 10) || 0,
        no_of_servings: parseInt(noOfServings, 10) || 0,
        meal_type: tempMealType,
        amount: parseInt(noOfServings, 10) || 1,
        serving_unit: 'serving',
        meal_time: time.toISOString(),
        image: mealImage || IMAGE_CONSTANTS.mealIcon,
        restaurant: { name: 'custom', location: '' },
        logging_mode: 'manual',
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

  // Function to get meal type based on time
  const getMealTypeByTime = (date: Date): string => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'breakfast';
    if (hour >= 12 && hour < 18) return 'lunch';
    if (hour >= 18 && hour <= 23) return 'dinner';
    return 'other';
  };

  // Set initial meal type based on current time
  useEffect(() => {
    const initialMealType = getMealTypeByTime(new Date());
    setTempMealType(initialMealType);
    setSelectedMealType(initialMealType);
  }, []);

  const [selectedMealType, setSelectedMealType] = useState(tempMealType);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
        <TouchableOpacity onPress={handleGoBack} className="p-1">
          <Text className="text-2xl text-[#1a1a1a]">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-[#1a1a1a]">
          Add Searched Meal
        </Text>
        <FavouriteIcon isFavourite={isFavorite} onPress={toggleFavorite} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 px-4 pb-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
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
                  source={IMAGE_CONSTANTS.galleryIcon}
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
            {Platform.OS === 'android' ? (
              <View className="border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white justify-center">
                <Picker
                  selectedValue={selectedMealType}
                  onValueChange={setSelectedMealType}
                  style={{ width: '100%', color: 'black' }}
                  itemStyle={{ fontSize: 16, color: 'black' }}
                >
                  <Picker.Item label="Breakfast" value="breakfast" />
                  <Picker.Item label="Lunch" value="lunch" />
                  <Picker.Item label="Dinner" value="dinner" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            ) : (
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
            )}
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
              <Text className="text-base font-medium text-black mb-2">
                Carbs
              </Text>
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

          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-base font-medium text-black mb-2">
                Amount
              </Text>
              <View className="flex-row items-center placeholder:text-lightGrey text-base border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
                <TextInput
                  className="flex-1 text-base"
                  keyboardType="number-pad"
                  value={newAmount}
                  onChangeText={setNewAmount}
                  placeholder="100"
                />
              </View>
            </View>

            <View className="w-[48%]">
              <Text className="text-base font-medium text-black mb-2">
                Serving Units
              </Text>
              {Platform.OS === 'android' ? (
                <View
                  className={`border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white justify-center ${isReadOnly ? 'opacity-50' : ''}`}
                >
                  <Picker
                    selectedValue={servingUnit}
                    onValueChange={setServingUnit}
                    style={{ width: '100%', color: 'black' }}
                    itemStyle={{ fontSize: 16, color: 'black' }}
                    enabled={!isReadOnly}
                  >
                    {SERVING_UNITS.map(unit => (
                      <Picker.Item key={unit} label={unit} value={unit} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    if (!isReadOnly) {
                      setTempServingUnit(servingUnit);
                      setShowServingUnitModal(true);
                    }
                  }}
                  disabled={isReadOnly}
                  className={`flex-row items-center border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white ${isReadOnly ? 'opacity-50' : ''}`}
                >
                  <Text className="flex-1 text-base text-[#222]">
                    {servingUnit}
                  </Text>
                  {!isReadOnly && (
                    <Image
                      source={IMAGE_CONSTANTS.chevronRightIcon}
                      className="w-4 h-4"
                      style={{ transform: [{ rotate: '90deg' }] }}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-base font-medium text-black mb-2">
              Description (Optional)
            </Text>
            <View className="border border-[#e0e0e0] rounded-sm px-3 py-3 bg-white">
              <TextInput
                value={mealDescription}
                onChangeText={setMealDescription}
                className="text-base"
                placeholder="Add any notes about this meal"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>
          </View>

          {favoriteMeals.length > 0 && (
            <>
              <Text className="text-base text-black mt-3 mb-3">
                Quick add from favourites
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-8"
              >
                {favoriteMeals.map(meal => (
                  <TouchableOpacity
                    key={meal.id}
                    className="w-[280px] mr-4 bg-lynch rounded-xl flex-row items-center px-4 py-4"
                    onPress={() => handleQuickAdd(meal)}
                  >
                    <Image
                      source={IMAGE_CONSTANTS.mealIcon}
                      className="w-[43px] h-[43px] mr-3"
                    />
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-base mb-1">
                        {meal.name}
                      </Text>
                      <Text className="text-white text-xs">
                        {meal.macros.calories} calories
                      </Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
                      <Text className="text-lynch text-2xl">＋</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>

        <View className="mx-5 border-t border-gray">
          <TouchableOpacity
            className={`bg-primaryLight mt-1 mb-1 rounded-full py-5 items-center ${!mealName.trim() ? 'opacity-50' : ''}`}
            onPress={handleSubmitMealLog}
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
      </KeyboardAvoidingView>

      {/* Unit Picker Modal */}
      <Modal
        visible={showServingUnitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServingUnitModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-xl p-4">
            <Text className="text-center text-base font-semibold mb-2">
              Select Serving Units
            </Text>
            <Picker
              selectedValue={tempServingUnit}
              onValueChange={setTempServingUnit}
              style={{ width: '100%' }}
              itemStyle={{ fontSize: 18, height: 180, color: 'black' }}
            >
              {SERVING_UNITS.map(unit => (
                <Picker.Item
                  key={unit}
                  label={unit}
                  value={unit}
                  style={{ color: 'black' }}
                />
              ))}
            </Picker>
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={() => setShowServingUnitModal(false)}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setServingUnit(tempServingUnit);
                  setShowServingUnitModal(false);
                }}
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
              style={{ width: '100%', height: 215 }}
              itemStyle={{ fontSize: 18, height: 120, color: '#000000' }}
            >
              <Picker.Item
                label="Breakfast"
                value="breakfast"
                color="#000000"
              />
              <Picker.Item label="Lunch" value="lunch" color="#000000" />
              <Picker.Item label="Dinner" value="dinner" color="#000000" />
              <Picker.Item label="Other" value="other" color="#000000" />
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

      {/* Time Picker */}
      {Platform.OS === 'ios' ? (
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
                display="spinner"
                onChange={handleTimeChange}
                style={{ alignSelf: 'center', height: 150 }}
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
      ) : (
        showTimeModal && (
          <DateTimePicker
            value={tempTime || new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              if (Platform.OS === 'android') {
                // On Android, handle all events
                if (event.type === 'set') {
                  // User confirmed the time
                  if (selectedTime) {
                    setTime(selectedTime);
                  }
                }
                // Always close the picker on Android (for both set and dismiss events)
                setShowTimeModal(false);
              } else {
                // On iOS, use temp state for spinner mode
                if (selectedTime) setTempTime(selectedTime);
              }
            }}
          />
        )
      )}
    </SafeAreaView>
  );
};

export default AddSearchedLoggedMealScreen;
