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

interface RouteParams {
  barcodeData: any;
  analyzedData?: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    amount?: number;
    serving_size?: number;
    no_of_servings?: number;
    meal_type?: string;
    meal_time?: string;
    photo_url?: string;
    serving_unit?: string;
    read_only?: boolean;
    description?: string;
  };
}

import { SERVING_UNITS } from 'constants/serving_units';
import { FavouriteIcon } from 'src/components/FavouriteIcon';
import { FavoriteMeal } from '../services/favoritesService';

// const SERVING_UNITS = [
//     'g',
//     'ml',
//     'oz',
//     'cup',
//     'tbsp',
//     'tsp',
//     'slice',
//     'piece',
// ];

/**
 * Screen for adding a new meal to the log
 */
export const EditMealScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'AddMeal'>>();
  const route = useRoute<RouteProp<{ AddMeal: RouteParams }, 'AddMeal'>>();
  const params = route.params || {};
  const { analyzedData } = params;

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
  const [mealDescription, setMealDescription] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [tempMealType, setTempMealType] = useState('breakfast');
  const [servingSize, setServingSize] = useState<string>('0');
  const [noOfServings, setNoOfServings] = useState<string>('0');
  const [mealId, setMealId] = useState<string>('');
  const [mealType, setMealType] = useState('breakfast');
  const [favoriteMeals, setFavoriteMeals] = useState<FavoriteMeal[]>([]);
  const [_loadingFavorites, setLoadingFavorites] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
  }>({
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  });
  const mixpanel = useMixpanel();
  const [servingUnit, setServingUnit] = useState<string>('g');
  const [showServingUnitModal, setShowServingUnitModal] = useState(false);
  const [tempServingUnit, setTempServingUnit] = useState('g');

  // Initialize form with analyzed data if available
  React.useEffect(() => {
    if (analyzedData) {
      setMealName(analyzedData.name || '');
      setCalories(analyzedData.calories?.toString() || '0');
      setProtein(analyzedData.protein?.toString() || '0');
      setCarbs(analyzedData.carbs?.toString() || '0');
      setFats(analyzedData.fat?.toString() || '0');
      setServingSize(analyzedData.serving_size?.toString() || '0');
      // Use amount, quantity, or no_of_servings (in that order of preference)
      const amountValue =
        analyzedData.amount ||
        analyzedData.quantity ||
        analyzedData.no_of_servings ||
        1;
      setNoOfServings(amountValue.toString());
      setMealType(analyzedData.meal_type || 'breakfast');
      setMealId(analyzedData.id || '');
      setServingUnit(analyzedData.serving_unit || 'g');
      setIsReadOnly(analyzedData.read_only || false);
      setMealDescription(analyzedData.description || '');
      if (analyzedData.photo_url) {
        setMealImage(analyzedData.photo_url);
        console.log('🔄 ExpoImage started loading FOR Meal:', mealImage);
      }
      if (analyzedData.meal_time) {
        setTime(new Date(analyzedData.meal_time));
      }
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

  // Fetch favorite meals on component mount
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const favorites = await FavoritesService.getFavorites();
        setFavoriteMeals(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (mixpanel && analyzedData?.id) {
      mixpanel.track({
        name: 'edit_meal_screen_viewed',
        properties: {
          meal_id: analyzedData.id,
          meal_name: analyzedData.name,
          meal_type: analyzedData.meal_type,
        },
      });
    }
  }, [analyzedData?.id, mixpanel]);
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
    mixpanel?.track({
      name: 'quick_add_from_favorites_clicked',
      properties: {
        meal_id: meal.id,
        meal_name: meal.name,
        meal_type: meal.meal_type,
      },
    });
    setMealName(meal.name);
    setCalories(meal.macros.calories.toString());
    setProtein(meal.macros.protein.toString());
    setCarbs(meal.macros.carbs.toString());
    setFats(meal.macros.fat.toString());
  };

  /**
   * Validates macro inputs
   */
  const validateMacros = (): boolean => {
    const errors = {
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
    };

    // let isValid = true;

    // const caloriesValue = parseInt(calories, 10) || 0;
    // const proteinValue = parseInt(protein, 10) || 0;
    // const carbsValue = parseInt(carbs, 10) || 0;
    // const fatsValue = parseInt(fats, 10) || 0;

    // if (caloriesValue <= 0) {
    //     errors.calories = 'Calories must be greater than 0';
    //     isValid = false;
    // }

    // if (proteinValue <= 0) {
    //     errors.protein = 'Protein must be greater than 0';
    //     isValid = false;
    // }

    // if (carbsValue <= 0) {
    //     errors.carbs = 'Carbs must be greater than 0';
    //     isValid = false;
    // }

    // if (fatsValue <= 0) {
    //     errors.fats = 'Fats must be greater than 0';
    //     isValid = false;
    // }

    setValidationErrors(errors);
    return true;
  };

  /**
   * Edits the current meal in the log
   */
  const handleEditMealLog = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!mealName.trim()) {
        Alert.alert('Error', 'Please enter a meal name');
        setLoading(false);
        return;
      }

      // Validate macros
      if (!validateMacros()) {
        Alert.alert(
          'Validation Error',
          'Please ensure all macro values are greater than 0'
        );
        setLoading(false);
        return;
      }

      console.log('Editing meal with ID:', mealId);
      console.log('Current meal type:', tempMealType);
      console.log('Current time:', time.toISOString());

      // Use the macros as entered (no multiplication by amount)
      const mealMacros = {
        calories: Math.round(parseInt(calories, 10) || 0),
        protein: Math.round(parseInt(protein, 10) || 0),
        carbs: Math.round(parseInt(carbs, 10) || 0),
        fat: Math.round(parseInt(fats, 10) || 0),
      };

      const newMeal = {
        name: mealName,
        calories: mealMacros.calories,
        protein: mealMacros.protein,
        carbs: mealMacros.carbs,
        fat: mealMacros.fat,
        meal_type: tempMealType,
        meal_time: time.toISOString(),
        amount: parseFloat(noOfServings) || 1,
        serving_unit: servingUnit,
        description: mealDescription || undefined,
        favorite: isFavorite,
        logging_mode: 'manual',
        notes: undefined,
        photo: mealImage
          ? {
              uri: mealImage,
              type: 'image/jpeg',
              name: 'meal_photo.jpg',
            }
          : undefined,
      };

      console.log('Meal request JSON:', JSON.stringify(newMeal));
      const response = await mealService.updateMeal(newMeal, mealId);
      console.log('Meal log response:', JSON.stringify(response));

      // Track meal edit in mixpanel
      if (mixpanel) {
        mixpanel?.track({
          name: 'meal_edited',
          properties: {
            meal_id: mealId,
            meal_type: tempMealType,
            amount: parseFloat(noOfServings) || 1,
            serving_unit: servingUnit,
            ...mealMacros,
          },
        });
      }

      navigation.navigate('MainTabs', { screen: 'Meals' });
    } catch (error) {
      console.error('Error editing meal:', error);
      Alert.alert('Error', 'Failed to edit meal');
    } finally {
      setLoading(false);
    }
  };
  const mealFieldUpdated = (field: string, value: string) => {
    mixpanel?.track({
      name: 'meal_field_updated',
      properties: {
        field,
        value,
        meal_id: mealId,
      },
    });
  };
  /**
   * Saves the current meal as a template
   */
  // const handleSaveTemplate = (): void => {
  //     // Implementation for saving a meal template
  //     console.log('Save as template');
  // };

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
        mixpanel?.track({
          name: 'meal_picture_uploaded',
          properties: {
            meal_id: mealId,
            meal_name: mealName,
            meal_type: mealType,
            image_uri: result.assets[0].uri,
          },
        });
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
          calories: parseInt(calories, 10) || 0,
          carbs: parseInt(carbs, 10) || 0,
          fat: parseInt(fats, 10) || 0,
          protein: parseInt(protein, 10) || 0,
        },
        serving_size: parseInt(servingSize, 10) || 0,
        no_of_servings: parseInt(noOfServings, 10) || 0,
        meal_type: mealType,
        favorite: isFavorite,
        amount: parseFloat(noOfServings) || 1,
        serving_unit: servingUnit,
        meal_time: time.toISOString(),
        image: mealImage || IMAGE_CONSTANTS.mealIcon,
        restaurant: { name: 'custom', location: '' },
        logging_mode: 'manual',
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(mealObj);
      setIsFavorite(newFavoriteStatus);
      if (newFavoriteStatus) {
        mixpanel?.track({
          name: 'meal_favorited_from_edit',
          properties: {
            meal_id: mealId,
            meal_name: mealName,
            meal_type: mealType,
          },
        });
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

  const handleUnitCancel = () => {
    setShowServingUnitModal(false);
  };

  const handleUnitDone = () => {
    setServingUnit(tempServingUnit);
    setShowServingUnitModal(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
        <TouchableOpacity onPress={handleGoBack} className="p-1">
          <Text className="text-2xl text-[#1a1a1a]">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-[#1a1a1a]">Edit Meal</Text>
        <FavouriteIcon isFavourite={isFavorite} onPress={toggleFavorite} />
        {/* <TouchableOpacity
                  onPress={toggleFavorite}
                  className={`p-1 ${!mealName.trim() ? 'opacity-50' : ''}`}
                  disabled={!mealName.trim()}
                >
                  <Image
                    source={isFavorite ? IMAGE_CONSTANTS.star : IMAGE_CONSTANTS.starIcon}
                    className="w-6 h-6"
                  />
                </TouchableOpacity> */}
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
                onBlur={() => mealFieldUpdated('name', mealName)}
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
              <View
                className={`flex-row items-center border placeholder:text-lightGrey text-base rounded-sm px-3 h-[4.25rem] bg-white ${
                  validationErrors.calories
                    ? 'border-red-500'
                    : 'border-[#e0e0e0]'
                }`}
              >
                <TextInput
                  className="flex-1 text-base"
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={text => {
                    setCalories(text);
                    if (validationErrors.calories) {
                      setValidationErrors(prev => ({
                        ...prev,
                        calories: '',
                      }));
                    }
                  }}
                  onBlur={() => mealFieldUpdated('calories', calories)}
                  placeholder="0"
                  onFocus={() => {
                    if (calories === '0') setCalories('');
                  }}
                />
                <Text className="text-base text-[#8e929a] ml-1">kcal</Text>
              </View>
              {validationErrors.calories ? (
                <Text className="text-red-500 text-xs mt-1">
                  {validationErrors.calories}
                </Text>
              ) : null}
            </View>

            <View className="w-[48%]">
              <Text className="text-base font-medium text-black mb-2">
                Protein
              </Text>
              <View
                className={`flex-row items-center border placeholder:text-lightGrey text-base rounded-sm px-3 h-[4.25rem] bg-white ${
                  validationErrors.protein
                    ? 'border-red-500'
                    : 'border-[#e0e0e0]'
                }`}
              >
                <TextInput
                  className="flex-1 text-base"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={text => {
                    setProtein(text);
                    if (validationErrors.protein) {
                      setValidationErrors(prev => ({ ...prev, protein: '' }));
                    }
                  }}
                  onBlur={() => mealFieldUpdated('protein', protein)}
                  placeholder="0"
                  onFocus={() => {
                    if (protein === '0') setProtein('');
                  }}
                />
                <Text className="text-base text-[#8e929a] ml-1">g</Text>
              </View>
              {validationErrors.protein ? (
                <Text className="text-red-500 text-xs mt-1">
                  {validationErrors.protein}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-base font-medium text-black mb-2">
                Carbs
              </Text>
              <View
                className={`flex-row items-center border placeholder:text-lightGrey text-base rounded-sm px-3 h-[4.25rem] bg-white ${
                  validationErrors.carbs ? 'border-red-500' : 'border-[#e0e0e0]'
                }`}
              >
                <TextInput
                  className="flex-1 text-base"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={text => {
                    setCarbs(text);
                    if (validationErrors.carbs) {
                      setValidationErrors(prev => ({ ...prev, carbs: '' }));
                    }
                  }}
                  onBlur={() => mealFieldUpdated('carbs', carbs)}
                  placeholder="0"
                  onFocus={() => {
                    if (carbs === '0') setCarbs('');
                  }}
                />
                <Text className="text-base text-[#8e929a] ml-1">g</Text>
              </View>
              {validationErrors.carbs ? (
                <Text className="text-red-500 text-xs mt-1">
                  {validationErrors.carbs}
                </Text>
              ) : null}
            </View>

            <View className="w-[48%]">
              <Text className="text-base text-black mb-2">Fats</Text>
              <View
                className={`flex-row items-center placeholder:text-lightGrey text-base border rounded-sm px-3 h-[4.25rem] bg-white ${
                  validationErrors.fats ? 'border-red-500' : 'border-[#e0e0e0]'
                }`}
              >
                <TextInput
                  className="flex-1 text-base"
                  keyboardType="numeric"
                  value={fats}
                  onChangeText={text => {
                    setFats(text);
                    if (validationErrors.fats) {
                      setValidationErrors(prev => ({ ...prev, fats: '' }));
                    }
                  }}
                  onBlur={() => mealFieldUpdated('fats', fats)}
                  placeholder="0"
                  onFocus={() => {
                    if (fats === '0') setFats('');
                  }}
                />
                <Text className="text-base text-[#8e929a] ml-1">g</Text>
              </View>
              {validationErrors.fats ? (
                <Text className="text-red-500 text-xs mt-1">
                  {validationErrors.fats}
                </Text>
              ) : null}
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
                  value={noOfServings}
                  onChangeText={text => {
                    // Remove any non-numeric characters
                    const cleanText = text.replace(/[^0-9]/g, '');
                    // Allow empty string but set to '1' if parsed number is less than 1
                    if (cleanText === '') {
                      setNoOfServings('');
                    } else {
                      const num = parseInt(cleanText);
                      if (isNaN(num)) {
                        setNoOfServings('1');
                      } else {
                        setNoOfServings(cleanText);
                      }
                    }
                  }}
                  onBlur={() => {
                    // Ensure value is at least 1 when input loses focus
                    const num = parseInt(noOfServings);
                    if (noOfServings === '' || isNaN(num) || num < 1) {
                      setNoOfServings('1');
                    }
                    mealFieldUpdated(
                      'amount',
                      noOfServings === '' || isNaN(num) || num < 1
                        ? '1'
                        : noOfServings
                    );
                  }}
                  placeholder="1"
                />
              </View>
            </View>

            <View className="w-[48%]">
              <Text className="text-base font-medium text-black mb-2">
                Serving Units
              </Text>
              {Platform.OS === 'android' ? (
                <View
                  className={`border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white justify-center ${
                    isReadOnly ? 'opacity-50' : ''
                  }`}
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
                  className={`flex-row items-center border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white ${
                    isReadOnly ? 'opacity-50' : ''
                  }`}
                  disabled={isReadOnly}
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

          {/* <TouchableOpacity
                        className="bg-[#f5f5f5] rounded-lg py-3.5 items-center mb-10"
                        onPress={handleSaveTemplate}
                    >
                        <Text className="text-[#333] text-base font-medium">Save as Template</Text>
                    </TouchableOpacity> */}
        </ScrollView>

        <View className="mx-5 border-t border-gray">
          <TouchableOpacity
            className={`bg-primaryLight mt-1 rounded-full mb-3 py-5 items-center ${
              !mealName.trim() ? 'opacity-50' : ''
            }`}
            onPress={handleEditMealLog}
            disabled={loading || !mealName.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Update log
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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

      {/* Unit Picker Modal */}
      <Modal
        visible={showServingUnitModal}
        transparent
        animationType="slide"
        onRequestClose={handleUnitCancel}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-xl p-4">
            <Text className="text-center text-base font-semibold mb-2">
              Select Unit
            </Text>
            {Platform.OS === 'ios' ? (
              <Picker
                selectedValue={tempServingUnit}
                onValueChange={setTempServingUnit}
                itemStyle={{ height: 120, fontSize: 20 }}
              >
                {SERVING_UNITS.map(unit => (
                  <Picker.Item key={unit} label={unit} value={unit} />
                ))}
              </Picker>
            ) : (
              <Picker
                selectedValue={tempServingUnit}
                onValueChange={setTempServingUnit}
                style={{ alignSelf: 'center' }}
              >
                {SERVING_UNITS.map(unit => (
                  <Picker.Item key={unit} label={unit} value={unit} />
                ))}
              </Picker>
            )}
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                onPress={handleUnitCancel}
                className="flex-1 items-center py-2"
              >
                <Text className="text-lg text-blue-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnitDone}
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

export default EditMealScreen;
