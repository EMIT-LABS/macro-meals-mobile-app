import { useMixpanel } from '@macro-meals/mixpanel/src';
import { usePosthog } from '@macro-meals/posthog_service/src';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { mealService } from 'src/services/mealService';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import DiscoverCard from '../components/DiscoverCard';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';
import { has, result, set } from 'lodash';

// Interface for the search API response
interface SearchMealResponse {
  results: Array<{
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal_time: string;
    meal_type: string;
    logging_mode: string;
    photo_url: string | null;
    created_at: string;
    notes: string | null;
    serving_unit: string;
    amount: number;
    read_only: boolean;
    favorite: boolean;
    search_tag: string;
  }>;
  total_results: number;
  search_query: string;
}
interface RouteParams {
  defaultDate: string;
  mealNameFromSearch?: string | null;
}

/**
 * ScanScreen component displays the various meal logging options:
 * - Scan with Camera (take a photo)
 * - Scan Barcode (scan a product)
 * - Manual Entry (search and log manually)
 */
const ScanScreenType: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'ScanScreenType'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ScanScreenType'>>();
  const params = (route.params as RouteParams) || {};
  const { defaultDate, mealNameFromSearch } = params;
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [localSearchResults, setLocalSearchResults] = useState<
    SearchMealResponse['results']
  >([]);
  const [localSearchLoading, setLocalSearchLoading] = useState(false);
  // const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const profile = useStore(state => state?.profile) || null;
  const mixpanel = useMixpanel();
  const posthog = usePosthog();
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  useEffect(() => {
    if (localSearchResults) {
      setIsFirstTimeUser(true);
    } else {
      setIsFirstTimeUser(false);
    }
    mixpanel?.track({
      name: 'add_meal_screen_opened',
      properties: {
        $screen_name: 'ScanScreenType',
        $current_url: 'ScanScreenType',
        entry_point: 'main_hub', // or actual value
        // is_first_time_user: isFirstTimeUser, // should be boolean
      },
    });
    posthog?.track({
      name: 'add_meal_screen_opened',
      properties: {
        $screen_name: 'ScanScreenType',
        $current_url: 'ScanScreenType',
        entry_point: 'main_hub', // or actual value
        is_first_time_user: isFirstTimeUser,
      },
    });
  }, []);
  // Debounced search functionality - triggers both local and global searches simultaneously
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (query.trim().length >= 2) {
            const trimmedQuery = query.trim();

            // Reset previous results and errors
            setNetworkError(null);

            // Start both searches simultaneously
            setLocalSearchLoading(true);
            // setGlobalSearchLoading(true);

            // Local search (user's logged meals)
            const localSearchPromise = (async () => {
              try {
                console.log('🔍 Sending local search query:', trimmedQuery);
                const baseUrl = 'https://api.macromealsapp.com/api/v1';
                const fullUrl = `${baseUrl}/meals/search?query=${encodeURIComponent(trimmedQuery)}`;
                console.log('🔍 Local search URL:', fullUrl);

                const response = (await mealService.searchMeal(
                  trimmedQuery
                )) as unknown as SearchMealResponse;

                console.log(
                  '🔍 Local search response:',
                  JSON.stringify(response, null, 2)
                );

                if (!response) {
                  console.error(
                    '❌ Local search response is null or undefined'
                  );
                  setLocalSearchResults([]);
                  return;
                }

                const results = response.results || [];
                setLocalSearchResults(results);

                mixpanel?.track({
                  name: 'local_search_results_viewed',
                  properties: {
                    query: trimmedQuery,
                    results_count: results.length,
                  },
                });
                posthog?.track({
                  name: 'local_search_results_viewed',
                  properties: {
                    $screen_name: 'ScanScreenType',
                    $current_url: 'ScanScreenType',
                    query: trimmedQuery,
                    results_count: results.length,
                  },
                });
              } catch (error) {
                console.error('Error in local search:', error);
                if (
                  error instanceof Error &&
                  error.message.includes('internet connection')
                ) {
                  setNetworkError(error.message);
                }
                setLocalSearchResults([]);
              } finally {
                setLocalSearchLoading(false);
                setHasSearched(true);

              }
            })();


            // Wait for both searches to complete
            await Promise.all([localSearchPromise]);
          } else {
            setLocalSearchResults([]);
            // setGlobalSearchResults([]);
            setLocalSearchLoading(false);
            // setGlobalSearchLoading(false);
          }
        }, 1500); // 1.5 second delay
      };
    })(),
    [] // mixpanel is stable from useMixpanel hook, no need to include in deps
  );

  // Trigger search when searchText changes
  useEffect(() => {
    if (searchFocused && searchText.trim().length >= 2) {
      debouncedSearch(searchText);
    } else {
      setLocalSearchResults([]);
            setHasSearched(false);
      setLocalSearchLoading(false);
      setNetworkError(null);
    }
  }, [searchText, searchFocused, debouncedSearch]);

  // Animate fade in/out on search focus change
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: searchFocused ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [searchFocused]);

  /**
   * Navigate to the camera screen to take a photo of food
   */
  const handleOpenCamera = () => {
    mixpanel?.track({
      name: 'add_meal_option_selected',
      properties: { option_type: 'scan_meal' },
    });
    posthog?.track({
      name: 'add_meal_option_selected',
      properties: {
        option_type: 'scan_meal',
        $screen_name: 'ScanScreenType',
        $current_url: 'ScanScreenType',
      },
    });
    if (profile?.has_macros === false || profile?.has_macros === undefined) {
      navigation.navigate('GoalSetupScreen' as never);
    } else {
      navigation.navigate('SnapMeal', { defaultDate });
    }
  };

  /**
   * Navigate to barcode scanner screen
   */
  const handleScanBarcode = () => {
    mixpanel?.track({
      name: 'add_meal_option_selected',
      properties: { option_type: 'scan_barcode' },
    });
    if (profile?.has_macros === false || profile?.has_macros === undefined) {
      navigation.navigate('GoalSetupScreen' as never);
    } else {
      navigation.navigate('BarcodeScanScreen', { defaultDate });
    }
  };

  /**
   * Navigate to manual meal entry/search screen
   */
  const handleManualEntry = (meal_name_from_search?: string) => {
    mixpanel?.track({
      name: 'add_meal_option_selected',
      properties: { option_type: 'manual_entry' },
    });
    mixpanel?.track({
      name: 'add_meal_option_selected',
      properties: { option_type: 'manual_entry' },
    });
    if (profile?.has_macros === false || profile?.has_macros === undefined) {
      navigation.navigate('GoalSetupScreen' as never);
    } else {
      navigation.navigate('AddMealScreen', { defaultDate , mealNameFromSearch: meal_name_from_search });
    }
  };

  const handleMealSuggestions = () => {
    if (profile?.has_macros === false || profile?.has_macros === undefined) {
      navigation.navigate('GoalSetupScreen' as never);
    } else {
      navigation.navigate('AiMealSuggestionsScreen', { defaultDate });
    }
  };

  const handleMealFinder = () => {
    navigation.navigate('MealFinderScreen' as never);
    posthog.track({
      name: 'meal_finder_opened_from_add_meal',
      properties: {
        entry_point: 'add_meal',
        $screen_name: 'ScanScreenType',
        $current_url: 'ScanScreenType',
      },
    });
  };

  const handleSearchClear = () => {
    setSearchText('');
    setSearchFocused(false);
    setLocalSearchResults([]);
          setHasSearched(false);

    // setGlobalSearchResults([]);
    setNetworkError(null);
    Keyboard.dismiss();
  };


  const handleAddToLog = async (meal: any): Promise<void> => {
    try {
      if (!meal.name.trim()) {
        console.error('Please enter a meal name');
        return;
      }

      // Prepare the meal data for the new screen
      const searchedMeal = {
        id: meal.id || '',
        name: meal.name,
        description: meal.description || null,
        calories: parseFloat(meal.calories.toString()) || 0,
        protein: parseFloat(meal.protein.toString()) || 0,
        carbs: parseFloat(meal.carbs.toString()) || 0,
        fat: parseFloat(meal.fat.toString()) || 0,
        amount: meal.amount || 100, // Base amount from API
        serving_unit: meal.serving_unit || 'g',
        read_only: meal.read_only || false,
        barcode: meal.barcode,
        notes: meal.notes,
        photo_url: meal.photo_url || null,
      };

      // Navigate to the new screen with the meal data
      navigation.navigate('AddSearchedLoggedMeal', {
        searchedMeal,
        defaultDate,
      });
      mixpanel?.track({
        name: 'prefilled_form_shown_from_search',
        properties: {
          result_id: meal.id,
          meal_name: meal.name,
          meal_type: meal.meal_type,
          time_of_day: meal.meal_time,
          calories: meal.calories,
          protein_g: meal.protein,
          carbs_g: meal.carbs,
          fats_g: meal.fat,
          amount: meal.amount,
          serving_size_g: meal.serving_unit,
        },
      });
      posthog?.track({
        name: 'prefilled_form_shown_from_search',
        properties: {
          $screen_name: 'ScanScreenType',
          $current_url: 'ScanScreenType',
          result_id: meal.id,
          meal_name: meal.name,
          meal_type: meal.meal_type,
          time_of_day: meal.meal_time,
          calories: meal.calories,
          protein_g: meal.protein,
          carbs_g: meal.carbs,
          fats_g: meal.fat,
          amount: meal.amount,
          serving_size_g: meal.serving_unit,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error preparing meal data:', error.message, error.stack);
      } else {
        try {
          console.error('Error preparing meal data:', JSON.stringify(error));
        } catch {
          console.error('Error preparing meal data:', error);
        }
      }
    }
  };

  const handleClose = () => {
    mixpanel?.track({
      name: 'add_meal_closed',
      properties: {
        entry_point: 'main_hub',
        // return_destination: destination,
      },
    });
    posthog?.track({
      name: 'add_meal_closed',
      properties: {
        $screen_name: 'ScanScreenType',
        $current_url: 'ScanScreenType',
        entry_point: 'main_hub',
        return_destination: 'main_hub',
      },
    });
    navigation.goBack();
  };

  useEffect(() => {
    if (
      searchText &&
      searchText.trim().length >= 2 &&
      !localSearchLoading 
    ) {
      posthog.track({
        name: 'search_no_results_prompt_shown',
        properties: {
          $screen_name: 'ScanScreenType',
          $current_url: 'ScanScreenType',
          query: searchText,
        },
      });
    }
  }, [searchText, localSearchLoading]);

  const fromLogsResults = localSearchResults.filter(
  item => item.search_tag === 'meal_log'
);

const globalResults = localSearchResults.filter(
  item => item.search_tag === 'global_search'
);

const combinedResults = [
  ...fromLogsResults.map(item => ({ ...item, source: 'local' })),
  ...globalResults.map(item => ({ ...item, source: 'global' })),
]

  const showNoResults = () => {
  return (
    hasSearched &&
    searchText &&
    searchText.trim().length >= 2 &&
    !localSearchLoading &&
    combinedResults.length === 0
  );
};

  return (
    
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <CustomSafeAreaView
        edges={['left', 'right']}
        paddingOverride={{ bottom: -100 }}
        className="flex-1 bg-white"
      >
        <StatusBar barStyle="dark-content" />
        {/* Header (always on solid white) */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
          <TouchableOpacity
            onPress={handleClose}
            className="w-8 h-8 rounded-full justify-center items-center"
          >
            <Image
              source={IMAGE_CONSTANTS.closeIcon}
              className="w-[14px] h-[14px] object-fill"
            />
          </TouchableOpacity>
          <Text className="text-[20px] font-semibold text-primary text-center">
            Log a meal
          </Text>
          <View style={{ width: 32 }} />
        </View>
        {/* Search Bar (on white) */}
        <View className="flex-row items-center bg-gray rounded-3xl h-[48px] mx-5 mb-[18px] px-4">
          <Image
            source={IMAGE_CONSTANTS.searchIcon}
            className="w-6 h-6 object-fill mr-2"
          />
          <TextInput
            className="flex-1 placeholder:text-[18px] placeholder:font-normal placeholder:text-lightGrey"
            placeholder="Search for a food"
            placeholderTextColor="#B0B0B0"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => {
              setSearchFocused(true);
            }}
            onBlur={() => {
              if (!searchText) setSearchFocused(false);
            }}
            editable={true}
            returnKeyType="search"
          />
          {searchFocused && (
            <TouchableOpacity onPress={handleSearchClear} className="ml-2">
              <Image
                source={IMAGE_CONSTANTS.closeIcon}
                className="w-4 h-4 object-fill"
              />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-1 bg-monteCarlo">
          <ImageBackground
            source={require('../../assets/add-meal-bg.png')}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              paddingBottom: 20,
            }}
            resizeMode="cover"
          >
            {searchFocused ? (
              <View className="flex-1 px-5 pt-2">

                {/* Loading state */}
                {localSearchLoading  ? (
                  <View className="items-center mt-10">
                    <ActivityIndicator size="small" color="#19a28f" />
                    <Text className="text-center text-base text-gray-500 mt-4">
                      Searching...
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Network error */}
                    {networkError ? (
                      <View className="items-center mt-10">
                        <Text className="text-center text-base text-red-500 px-4 mb-2">
                          {networkError}
                        </Text>
                      </View>
                    ) : (
                      <>
                        {/* Combined results */}
                        {localSearchResults.length > 0 && (
                          
                          <FlatList
                            style={{ flex: 1 , overflow: 'scroll'}}
                            contentContainerStyle={{
                              paddingBottom: 0,
                            }}
                            showsVerticalScrollIndicator={false}
                            data={combinedResults}
                            keyExtractor={(item, idx) =>
                              `${item.source}-${item.id}-${idx}`
                            }
                            
                            renderItem={({ item, index }) => {
                            const isLocal = item.source === 'local';
                              const isFirstLocal = isLocal && index === 0;

                          const isFirstGlobal =
                          item.source === 'global' &&
                            index === fromLogsResults.length;
                              return (
                                <View>
                                 
                                  {isFirstLocal && (
                                 <Text className="text-sm font-semibold text-gray-500 mt-3 mb-1.5">
                                   From your logs
                                      </Text>
                                    )}

                              {/* Global search results */}
                               {isFirstGlobal && (
                                     <View className="mt-3 mb-1.5">
                            {fromLogsResults.length > 0 && (
                           <View className="h-px bg-gray-300 mb-1.5" />
                                )}
                              <Text className="text-sm font-semibold text-gray-500">
                             Global search results
                                </Text>
                             </View>
                                      )}

                                  {/* Meal item */}
                                  <View className="bg-white rounded-lg py-4 px-4 mb-3 flex-row items-center justify-between ">
                                    <View className="flex-1 ">
                                      <Text className="text-sm font-semibold mb-2">
                                        {item.name}
                                      </Text>
                                      {item.description && (
                                        <Text className="text-xs text-gray-500 mb-2">
                                          {item.description}
                                        </Text>
                                      )}
                                      <View className="flex-row items-center gap-2 mt-2">
                                        <View className="flex-row items-center justify-center gap-1">
                                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-kryptoniteGreen rounded-full">
                                            <Image
                                              source={
                                                IMAGE_CONSTANTS.caloriesIcon
                                              }
                                              className="w-[10px] h-[10px] object-fill"
                                            />
                                          </View>
                                          <Text className="text-xs text-black text-center font-medium">
                                            {item.calories} cal
                                          </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                                            <Text className="text-white text-[10px] text-center font-medium">
                                              C
                                            </Text>
                                          </View>
                                          <Text className="text-xs text-textMediumGrey text-center font-medium">
                                            {item.carbs}g
                                          </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                                            <Text className="text-white text-[10px] text-center font-medium">
                                              F
                                            </Text>
                                          </View>
                                          <Text className="text-xs text-textMediumGrey text-center font-medium">
                                            {item.fat}g
                                          </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                          <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                                            <Text className="text-white text-[10px] text-center font-medium">
                                              P
                                            </Text>
                                          </View>
                                          <Text className="text-xs text-textMediumGrey text-center font-medium">
                                            {item.protein}g
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => {
                                        mixpanel?.track({
                                          name: isLocal
                                            ? 'local_search_result_add_clicked'
                                            : 'global_search_result_add_clicked',
                                          properties: {
                                            result_id: item.id,
                                            meal_name: item.name,
                                            calories: item.calories,
                                            protein_g: item.protein,
                                            carbs_g: item.carbs,
                                            fats_g: item.fat,
                                          },
                                        });
                                        posthog?.track({
                                          name: isLocal
                                            ? 'local_search_result_add_clicked'
                                            : 'global_search_result_add_clicked',
                                          properties: {
                                            $screen_name: 'ScanScreenType',
                                            $current_url: 'ScanScreenType',
                                            result_id: item.id,
                                            meal_name: item.name,
                                            calories: item.calories,
                                            protein_g: item.protein,
                                            carbs_g: item.carbs,
                                            fats_g: item.fat,
                                          },
                                        });
                                        handleAddToLog(item);
                                      }}
                                    >
                                      <Image
                                        source={IMAGE_CONSTANTS.fabIcon}
                                        className="w-6 h-6 object-fill"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            }}
                          />
                        )}
                        : { showNoResults() && (
                          <>
                            <Text className="text-center text-base text-gray-500 mt-10">
                              No results found. 
                              Can&apos;t find your meal? Log it manually.
                            </Text>
                              <DiscoverCard
                      icon={
                        <Image
                          source={IMAGE_CONSTANTS.editIcon}
                          className="w-6 h-6 object-fill"
                        />
                      }
                      title="Manual entry"
                      description="Log your meal details including portion sizes and ingredients for precise macro tracking."
                      onPress={() => handleManualEntry(searchText)}
                    />
                    </>
                          )
                          }
                      </>
                    )}
                  </>
                )}

              </View>
            ) : (
              // Show scan options, discover more, and favorites with fade animation
              <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                  contentContainerStyle={{ paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View className="mt-10 mx-5">
                    <Text className="text-sm font-semibold text-black mb-5">
                      SCAN OPTIONS
                    </Text>
                    <View className="flex-row justify-between gap-3">
                      <TouchableOpacity
                        className="flex-1 bg-white rounded-md items-center py-6 shadow-sm"
                        onPress={handleScanBarcode}
                      >
                        <View className="flex-row items-center mb-2 justify-center mr-2 w-10 h-10 rounded-full bg-lightGreen">
                          <Image
                            source={IMAGE_CONSTANTS.scanBarcodeIcon}
                            className="w-6 h-6 object-fill"
                          />
                        </View>
                        <Text className="text-base font-normal text-black">
                          Scan a barcode
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-white rounded-md items-center py-6 shadow-sm"
                        onPress={handleOpenCamera}
                      >
                        <View className="flex-row items-center mb-2 justify-center mr-2 w-10 h-10 rounded-full bg-lightGreen">
                          <Image
                            source={IMAGE_CONSTANTS.scanMealIcon}
                            className="w-6 h-6 object-fill"
                          />
                        </View>
                        <Text className="text-base font-normal text-black">
                          Scan a meal
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* Discover More */}
                  <View className="mt-8 mx-5">
                    <Text className="text-sm font-semibold text-black mb-2">
                      DISCOVER MORE
                    </Text>
                    <DiscoverCard
                      icon={
                        <Image
                          source={IMAGE_CONSTANTS.editIcon}
                          className="w-6 h-6 object-fill"
                        />
                      }
                      title="Manual entry"
                      description="Log your meal details including portion sizes and ingredients for precise macro tracking."
                      onPress={handleManualEntry}
                    />
                    <DiscoverCard
                      icon={
                        <Image
                          source={IMAGE_CONSTANTS.wandIcon}
                          className="w-6 h-6 object-fill"
                        />
                      }
                      title="AI Recipe suggestions"
                      description="Get personalized meal recommendations based on your remaining macros."
                      onPress={handleMealSuggestions}
                    />
                    <DiscoverCard
                      icon={
                        <Image
                          source={IMAGE_CONSTANTS.locationIcon}
                          className="w-6 h-6 object-fill"
                        />
                      }
                      title="Meal Finder"
                      description="Discover nearby restaurant options that align with your macro targets and dietary preferences."
                      onPress={handleMealFinder}
                    />
                  </View>
                </ScrollView>
              </Animated.View>
            )}
          </ImageBackground>
        </View>
      </CustomSafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default ScanScreenType;
