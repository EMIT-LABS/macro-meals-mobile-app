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
import { MealFeedback, mealService } from '../services/mealService';
import useStore from '../store/useStore';

interface RouteParams {
  barcodeData?: string;
  analyzedData?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    serving_size?: number;
    no_of_servings?: number;
    meal_type?: string;
    meal_time?: string;
    amount?: number;
    read_only?: boolean;
    logging_mode?: string;
    hideImage?: boolean;
    photo?: string;
    description?: string;
    scanned_image?: string;
  };
  defaultDate?: string;
  mealNameFromSearch?: string | null; 
}

import { SERVING_UNITS } from 'constants/serving_units';
import { FavouriteIcon } from 'src/components/FavouriteIcon';
import { RateMacroMeals } from 'src/components/RateMacroMeals';
import { FavoriteMeal } from '../services/favoritesService';
import { usePosthog } from '@macro-meals/posthog_service/src';
import BarcodeScanScreen from './BarcodeScanScreen';

/**
 * Screen for adding a new meal to the log
 */
export const AddMealScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'AddMeal'>>();
  const route =
    useRoute<
      RouteProp<
        {
          AddMeal: RouteParams;
          AddMealScreen: RouteParams;
          BarcodeScanScreen: RouteParams;
          SnapMeal: RouteParams;
        },
        'AddMeal' | 'AddMealScreen' | 'BarcodeScanScreen' | 'SnapMeal'
      >
    >();
  const params = route.params || {};
  const { barcodeData, analyzedData, defaultDate, mealNameFromSearch } = params;

  const [mealName, setMealName] = useState<string>('');
  const [calories, setCalories] = useState<string>('0');
  const [protein, setProtein] = useState<string>('0');
  const [carbs, setCarbs] = useState<string>('0');
  const [fats, setFats] = useState<string>('0');
  const [amount, setAmount] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);
  const [time, setTime] = useState<Date>(() => {
    if (analyzedData && analyzedData.meal_time) {
      return new Date(analyzedData.meal_time);
    } else if (defaultDate) {
      return new Date(defaultDate);
    } else {
      return new Date();
    }
  });
  const [searchMealName, setSearchMealName] = useState<string | null | undefined>(mealNameFromSearch ?? "");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [servingUnit, setServingUnit] = useState<string>('grams');
  const [noOfServings, setNoOfServings] = useState<string>('1'); // Default to '1'
  const [showServingUnitModal, setShowServingUnitModal] = useState(false);
  const [tempServingUnit, setTempServingUnit] = useState('grams');
  const [isFavorite, setIsFavorite] = useState(false);
  const [mealDescription, setMealDescription] = useState('');
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [tempMealType, setTempMealType] = useState('breakfast');
  const [mealType, setMealType] = useState('breakfast');
  const [logging_mode, setLoggingMode] = useState('manual');
  const [favoriteMeals, setFavoriteMeals] = useState<FavoriteMeal[]>([]);
  const posthog = usePosthog();
  // const [loadingFavorites, setLoadingFavorites] = useState<boolean>(false);
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
  useEffect(() => {
    mixpanel?.track({
      name: 'manual_entry_opened',
      properties: {
        entry_point: 'add_meal',
      },
    });
    posthog?.track({
      name: 'manual_entry_opened',
      properties: {
          $screen_name: 'AddMealScreen',
          $current_url: 'AddMealScreen',
        entry_point: 'add_meal',
      },
    });
  }, []);
  // Initialize form with analyzed data if available
  React.useEffect(() => {
    if (analyzedData) {
      setMealName(analyzedData.name || '');
      setCalories(analyzedData.calories?.toString() || '0');
      setProtein(analyzedData.protein?.toString() || '0');
      setCarbs(analyzedData.carbs?.toString() || '0');
      setNoOfServings(analyzedData.no_of_servings?.toString() || '0');
      setFats(analyzedData.fat?.toString() || '0');
      setMealType(analyzedData.meal_type || 'breakfast');
      setAmount(analyzedData.amount?.toString() || '1');
      setLoggingMode(analyzedData.logging_mode || 'manual');
      setMealDescription(analyzedData.description || '');

      // Set the photo if available from SnapMealScreen
      if (analyzedData.photo) {
        setMealImage(analyzedData.photo);
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
      //  setLoadingFavorites(true);
      try {
        const favorites = await FavoritesService.getFavorites();
        setFavoriteMeals(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        console.log('Favorites fetched');
        //  setLoadingFavorites(false);
      }
    };
    fetchFavorites();
  }, []);

  /**
   * Handles going back to the previous screen
   */
  const handleGoBack = (): void => {
    mixpanel?.track({
      name: 'manual_back_to_add_meal',
      properties: {
        gesture_type: 'button',
      },
    });
    posthog?.track({
      name: 'manual_back_to_add_meal',
      properties: {
        $screen_name: 'AddMealScreen',
        $current_url: 'AddMealScreen',
        gesture_type: 'button',
      },
    });
    navigation.goBack();
  };

  /**
   * Handles saving the meal to bookmarks
   */
  const _handleBookmark = (): void => {
    // Implementation for bookmarking a meal
    console.log('Bookmark meal');
  };

  /**
   * Quick add a favorite meal
   * @param meal - The favorite meal to add
   */
  const handleQuickAdd = (meal: FavoriteMeal): void => {
    mixpanel?.track({
      name: 'manual_favorite_selected',
      properties: {
        favorite_meal_id: meal.id,
        replaced_existing: Boolean(mealName),
      },
    });
    posthog?.track({
      name: 'manual_favorite_selected',
      properties: {
        $screen_name: 'AddMealScreen',
        $current_url: 'AddMealScreen',
        favorite_meal_id: meal.id,
        replaced_existing: Boolean(mealName),
      },
    });
    setMealName(meal.name);
    setCalories(meal.macros.calories.toString());
    setProtein(meal.macros.protein.toString());
    setCarbs(meal.macros.carbs.toString());
    setNoOfServings(meal?.no_of_servings?.toString() || '1');
    setFats(meal.macros.fat.toString());
    setLoggingMode(meal.logging_mode || 'manual');
    setMealType(meal.meal_type);
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
    mixpanel?.track({
      name: 'add_to_log_from_manual_submitted',
      properties: {
        meal_id: mealName,
        meal_type: tempMealType,
        time_of_day: time.toISOString(),
        calories: parseInt(calories, 10) || 0,
        protein_g: parseInt(protein, 10) || 0,
        carbs_g: parseInt(carbs, 10) || 0,
        fats_g: parseInt(fats, 10) || 0,
        amount: parseInt(noOfServings, 10) || 1,
        serving_unit: servingUnit,
      },
    });
    posthog?.track({
      name: 'add_to_log_from_manual_submitted',
      properties: {
        $screen_name: 'AddMealScreen',
        $current_url: 'AddMealScreen',
        meal_id: mealName,
        meal_type: tempMealType,
        time_of_day: time.toISOString(),
        calories: parseInt(calories, 10) || 0,
        protein_g: parseInt(protein, 10) || 0,
        carbs_g: parseInt(carbs, 10) || 0,
        fats_g: parseInt(fats, 10) || 0,
        amount: parseInt(noOfServings, 10) || 1,
        serving_unit: servingUnit,
      },
    });
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

      if (defaultDate) {
        const yesterdayTime = new Date(defaultDate); // Convert string to Date object
        setTime(yesterdayTime);
      }

      // Ensure amount is at least 1 and is an integer
      const amountValue = Math.max(1, parseInt(amount) || 1);

      // Use the macros as entered (no multiplication by amount)
      const mealMacros = {
        calories: Math.round(parseInt(calories, 10) || 0),
        protein: Math.round(parseInt(protein, 10) || 0),
        carbs: Math.round(parseInt(carbs, 10) || 0),
        fat: Math.round(parseInt(fats, 10) || 0),
      };

      // Create the meal request object that matches LogMealRequest interface
      const mealRequest = {
        name: mealName,
        calories: mealMacros.calories,
        protein: mealMacros.protein,
        carbs: mealMacros.carbs,
        fat: mealMacros.fat,
        meal_type: tempMealType,
        meal_time: time.toISOString(),
        amount: amountValue,
        serving_size: servingUnit,
        serving_unit: servingUnit,
        description: mealDescription || undefined,
        logging_mode: logging_mode,
        barcode: barcodeData || undefined, // Include barcode if available
        photo: mealImage
          ? {
              uri: mealImage,
              type: 'image/jpeg',
              name: 'meal_photo.jpg',
            }
          : undefined,
      };

      // Log the request data for debugging
      console.log('Meal request data:', JSON.stringify(mealRequest, null, 2));

      // Send the request
      await mealService.logMeal(mealRequest);
      mixpanel?.track({
        name: 'meal_saved_from_meals',
        properties: {
          meal_name: mealName ?? null,
          target_date: mealRequest.meal_time,
          meal_type: mealRequest.meal_type,
          calories: mealRequest.calories,
          protein_g: mealRequest.protein,
          carbs_g: mealRequest.carbs,
          fats_g: mealRequest.fat,
          serving_size_g: mealRequest.amount,
        },
      });
      posthog?.track({
        name: 'meal_saved_from_meals',
        properties: {
          $screen_name: 'AddMealScreen',
          $current_url: 'AddMealScreen',
          meal_name: mealName ?? null,
          target_date: mealRequest.meal_time,
          meal_type: mealRequest.meal_type,
          calories: mealRequest.calories,
          protein_g: mealRequest.protein,
          carbs_g: mealRequest.carbs,
          fats_g: mealRequest.fat,
          serving_size_g: mealRequest.amount,
        },
      });
      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      // Track meal logging
      mixpanel?.track({
        name: 'meal_logged',
        properties: {
          logging_mode: logging_mode,
          meal_type: tempMealType,
          meal_time: time.toISOString(),
          amount: amountValue,
          serving_size: servingUnit,
          barcode: barcodeData || null, // Track barcode usage
          ...mealMacros,
        },
      });
      posthog?.track({
        name: 'meal_logged',
        properties: {
          $screen_name: 'AddMealScreen',
          $current_url: 'AddMealScreen',
          logging_mode: logging_mode,
          meal_type: tempMealType,
          meal_time: time.toISOString(),
          amount: amountValue,
          serving_size: servingUnit,
          barcode: barcodeData || null, // Track barcode usage
          ...mealMacros,
        },
      });

      navigation.navigate('MainTabs', { screen: 'Meals' });
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert(
        'Error',
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOnLike = async () => {
    try {
      console.log('THE BarCode:', barcodeData);
      await mealService.productFeedback(
        {
          feedback: MealFeedback.ThumbUp,
          barcode: barcodeData || '',
          mealImage: mealImage || '',
        },
        mealName
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to like meal. Please try again.');
      console.error('Error liking meal:', error);
    }
  };
  const handleOnDislike = async () => {
    try {
      await mealService.productFeedback(
        {
          feedback: MealFeedback.ThumbDown,
          barcode: barcodeData || '',
          mealImage: mealImage || '',
        },
        mealName
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to dislike meal. Please try again.');
      console.error('Error disliking meal:', error);
    }
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
          name: 'manual_photo_uploaded',
          properties: {
            file_type: result.assets[0].type ?? 'image',
            file_size: result.assets[0].fileSize ?? null,
          },
        });
        posthog?.track({
          name: 'manual_photo_uploaded',
          properties: {
            $screen_name: 'AddMealScreen',
            $current_url: 'AddMealScreen',
            file_type: result.assets[0].type ?? 'image',
            file_size: result.assets[0].fileSize ?? null,
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
        serving_size: parseInt(noOfServings, 10) || 0,
        no_of_servings: parseInt(noOfServings, 10) || 0,
        meal_type: mealType,
        logging_mode: logging_mode,
        amount: parseInt(amount, 10) || 0,
        serving_unit: servingUnit,
        meal_time: time.toISOString(),
        image: mealImage || IMAGE_CONSTANTS.mealIcon,
        restaurant: { name: 'custom', location: '' },
        favorite: isFavorite,
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(mealObj);
      setIsFavorite(newFavoriteStatus);
      mixpanel?.track({
        name: 'favorite_toggled_in_manual',
        properties: {
          favorite_state: newFavoriteStatus,
        },
      });
      posthog?.track({
        name: 'favorite_toggled_in_manual',
        properties: {
          $screen_name: 'AddMealScreen',
          $current_url: 'AddMealScreen',
          favorite_state: newFavoriteStatus,
        },
      });
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
    if (hour >= 12 && hour < 17) return 'lunch';
    if (hour >= 17 && hour <= 23) return 'dinner';
    return 'other';
  };

  // Set initial meal type based on current time
  useEffect(() => {
    const initialMealType = getMealTypeByTime(time);
    setTempMealType(initialMealType);
    setSelectedMealType(initialMealType);
  }, [time]);

  const [selectedMealType, setSelectedMealType] = useState(tempMealType);
  const handleOpenTimeModal = () => {
    mixpanel?.track({ name: 'custom_date_picker_opened' });
    posthog?.track({
      name: 'custom_date_picker_opened',
      properties: {
        $screen_name: 'AddMealScreen',
        $current_url: 'AddMealScreen',
      },
    });

    setShowTimeModal(true);
  };

  useEffect(() => {
  if (mealNameFromSearch) {
    setMealName(mealNameFromSearch);
  }
}, [mealNameFromSearch]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
        <TouchableOpacity onPress={handleGoBack} className="p-1">
          <Text className="text-2xl text-[#1a1a1a]">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-[#1a1a1a]">Add Meal </Text>
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
          {!analyzedData?.hideImage && (
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
          )}

          {barcodeData && (
            <View className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-sm text-blue-700 font-medium mb-1">
                Barcode Scanned
              </Text>
              <Text className="text-xs text-blue-600 font-mono">
                {barcodeData}
              </Text>
            </View>
          )}

          <View className={`${analyzedData?.hideImage ? 'mt-10' : ''} mb-4`}>
            <Text className="text-base font-medium mb-2">Meal Name</Text>
            <View className="flex-row items-center border placeholder:text-lightGrey text-base border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white">
              <TextInput
                value={mealName}
                onChangeText={text => {
                  if (text !== mealName) {
                    mixpanel?.track({
                      name: 'manual_field_updated',
                      properties: {
                        field_name: 'meal_name',
                        old_value: mealName,
                        new_value: text,
                      },
                    });
                    posthog?.track({
                      name: 'manual_field_updated',
                      properties: {
                        $screen_name: 'AddMealScreen',
                        $current_url: 'AddMealScreen',
                        field_name: 'meal_name',
                        old_value: mealName,
                        new_value: text,
                      },
                    });
                  }
                  setMealName(text);
                }}
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
                  enabled={false}
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
                  disabled={true}
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
                handleOpenTimeModal();
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
                    if (text !== calories) {
                      mixpanel?.track({
                        name: 'manual_field_updated',
                        properties: {
                          field_name: 'calories',
                          old_value: calories,
                          new_value: text,
                        },
                      });
                      posthog?.track({
                        name: 'manual_field_updated',
                        properties: {
                          $screen_name: 'AddMealScreen',
                          $current_url: 'AddMealScreen',
                          field_name: 'calories',
                          old_value: calories,
                          new_value: text,
                        },
                      });
                    }
                    setCalories(text);
                    if (validationErrors.calories) {
                      setValidationErrors(prev => ({
                        ...prev,
                        calories: '',
                      }));
                    }
                  }}
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
                    if (text !== protein) {
                      mixpanel?.track({
                        name: 'manual_field_updated',
                        properties: {
                          field_name: 'protein',
                          old_value: protein,
                          new_value: text,
                        },
                      });
                      posthog?.track({
                        name: 'manual_field_updated',
                        properties: {
                          $screen_name: 'AddMealScreen',
                          $current_url: 'AddMealScreen',
                          field_name: 'protein',
                          old_value: protein,
                          new_value: text,
                        },
                      });
                    }
                    setProtein(text);
                    if (validationErrors.protein) {
                      setValidationErrors(prev => ({
                        ...prev,
                        protein: '',
                      }));
                    }
                  }}
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
                    if (text !== carbs) {
                      mixpanel?.track({
                        name: 'manual_field_updated',
                        properties: {
                          field_name: 'carbs',
                          old_value: carbs,
                          new_value: text,
                        },
                      });
                      posthog?.track({
                        name: 'manual_field_updated',
                        properties: {
                          $screen_name: 'AddMealScreen',
                          $current_url: 'AddMealScreen',
                          field_name: 'carbs',
                          old_value: carbs,
                          new_value: text,
                        },
                      });
                    }
                    setCarbs(text);
                    if (validationErrors.carbs) {
                      setValidationErrors(prev => ({
                        ...prev,
                        carbs: '',
                      }));
                    }
                  }}
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
                    if (text !== fats) {
                      mixpanel?.track({
                        name: 'manual_field_updated',
                        properties: {
                          field_name: 'fats',
                          old_value: fats,
                          new_value: text,
                        },
                      });
                      posthog?.track({
                        name: 'manual_field_updated',
                        properties: {
                          $screen_name: 'AddMealScreen',
                          $current_url: 'AddMealScreen',
                          field_name: 'fats',
                          old_value: fats,
                          new_value: text,
                        },
                      });
                    }
                    setFats(text);
                    if (validationErrors.fats) {
                      setValidationErrors(prev => ({
                        ...prev,
                        fats: '',
                      }));
                    }
                  }}
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
                  value={amount}
                  onChangeText={text => {
                    // Remove any non-numeric characters
                    const cleanText = text.replace(/[^0-9]/g, '');
                    // Fire Mixpanel event if value is changing
                    if (cleanText !== amount) {
                      mixpanel?.track({
                        name: 'manual_field_updated',
                        properties: {
                          field_name: 'amount',
                          old_value: amount,
                          new_value: cleanText,
                        },
                      });
                      posthog?.track({
                        name: 'manual_field_updated',
                        properties: {
                          $screen_name: 'AddMealScreen',
                          $current_url: 'AddMealScreen',
                          field_name: 'amount',
                          old_value: amount,
                          new_value: cleanText,
                        },
                      });
                    }
                    // Allow empty string or valid numbers
                    if (cleanText === '') {
                      setAmount('');
                    } else {
                      const num = parseInt(cleanText);
                      if (isNaN(num)) {
                        setAmount('1');
                      } else {
                        setAmount(cleanText);
                      }
                    }
                  }}
                  onBlur={() => {
                    // Ensure value is at least 1 when input loses focus
                    const num = parseInt(amount);
                    if (amount === '' || isNaN(num) || num < 1) {
                      setAmount('1');
                    }
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
                <View className="border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white justify-center">
                  <Picker
                    selectedValue={servingUnit}
                    onValueChange={setServingUnit}
                    style={{ width: '100%', color: 'black' }}
                    itemStyle={{ fontSize: 16, color: 'black' }}
                    enabled={!analyzedData?.read_only}
                  >
                    {SERVING_UNITS.map(unit => (
                      <Picker.Item key={unit} label={unit} value={unit} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={analyzedData?.read_only}
                  onPress={() => {
                    setTempServingUnit(servingUnit);
                    setShowServingUnitModal(true);
                  }}
                  className="flex-row items-center border border-[#e0e0e0] rounded-sm px-3 h-[4.25rem] bg-white"
                >
                  <Text
                    className={`flex-1 text-base ${
                      analyzedData?.read_only ? 'text-[#8e929a]' : 'text-[#222]'
                    }`}
                  >
                    {servingUnit}
                  </Text>
                  <Image
                    source={IMAGE_CONSTANTS.chevronRightIcon}
                    className="w-4 h-4"
                    style={{ transform: [{ rotate: '90deg' }] }}
                  />
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

          {analyzedData?.hideImage ? (
            <RateMacroMeals onLike={handleOnLike} onDislike={handleOnDislike} />
          ) : null}

          {/* <TouchableOpacity
                        className="bg-[#f5f5f5] rounded-lg py-3.5 items-center mb-10"
                        onPress={handleSaveTemplate}
                    >
                        <Text className="text-[#333] text-base font-medium">Save as Template</Text>
                    </TouchableOpacity> */}
        </ScrollView>

        <View className="mx-5 border-t border-gray">
          <TouchableOpacity
            className={`bg-primaryLight mt-1 mb-3 rounded-full py-5 items-center ${
              !mealName.trim() ? 'opacity-50' : ''
            }`}
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
        onRequestClose={() => setShowServingUnitModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-xl p-4">
            <Text className="text-center text-base font-semibold mb-2">
              Select Serving Units
            </Text>
            <Picker
              selectedValue={tempServingUnit}
              onValueChange={value => {
                if (Platform.OS === 'android') {
                  // On Android, immediately update the serving unit
                  setServingUnit(value);
                  setTempServingUnit(value);
                  // Close modal after selection
                  setShowServingUnitModal(false);
                  if (tempServingUnit) {
                    posthog.track({
                      name: 'serving_unit_selected',
                      properties: {
                        $screen_name: 'AddMealScreen',
                        $current_url: 'AddMealScreen',
                        serving_unit: tempServingUnit,
                      },
                    });
                  }
                } else {
                  // On iOS, use temp state for modal mode
                  setTempServingUnit(value);
                  if (tempServingUnit) {
                    posthog.track({
                      name: 'serving_unit_selected',
                      properties: {
                        $screen_name: 'AddMealScreen',
                        $current_url: 'AddMealScreen',
                        serving_unit: tempServingUnit,
                      },
                    });
                  }
                }
              }}
              style={{ width: '100%', color: 'black' }}
              itemStyle={{ fontSize: 18, height: 180, color: 'black' }}
            >
              {SERVING_UNITS.map(unit => (
                <Picker.Item key={unit} label={unit} value={unit} />
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
    </SafeAreaView>
  );
};

export default AddMealScreen;
