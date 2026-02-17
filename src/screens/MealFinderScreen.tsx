import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Modalize } from 'react-native-modalize';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { locationService } from '../services/locationService';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';
import MapsService from '../../packages/maps_service/src/maps_service';
import {
  RestaurantService,
  type AutocompletePrediction,
} from '../../packages/maps_service/src/services/restaurant_service';

import { MealFinderListView } from '../components/meal_finder_components/MealFinderListView';
import { MealFinderMapView } from '../components/meal_finder_components/MealFinderMapView';
import { RemainingTodayView } from '../components/meal_finder_components/RemainingTodayView';
import { mealService } from '../services/mealService';
import { Meal } from '../types';
import { usePosthog } from '@macro-meals/posthog_service/src';

interface MacroData {
  label: 'Protein' | 'Carbs' | 'Fat';
  value: number;
  color: string;
}

interface MockLocation {
  label: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const defaultMacroData: MacroData[] = [
  { label: 'Protein', value: 0, color: '#6C5CE7' },
  { label: 'Carbs', value: 0, color: '#FFC107' },
  { label: 'Fat', value: 0, color: '#FF69B4' },
];

type TabType = 'list' | 'map';


interface RouteParams{
  defaultDate:string
}

const MealFinderScreen: React.FC = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'MealFinderScreen'>
    >();
      const route = useRoute<RouteProp<{ BarcodeScanScreen: RouteParams }, 'BarcodeScanScreen'>>();
      const params = route.params || {};
      const { defaultDate } = params;
  const macrosPreferences = useStore(state => state.macrosPreferences);
  const token = useStore(state => state.token);
  // const [initializing, setInitializing] = useState<boolean>(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [_currentLocation, setCurrentLocation] = useState<string>(
    'Getting location...'
  );
  const [currentLocationCoords, setCurrentLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>(
    'Getting location...'
  );
  const [search, setSearch] = useState<string>('');
  const [nearbyPlaces, setNearbyPlaces] = useState<MockLocation[]>([]);
  const [nearbyPlacesLoading, setNearbyPlacesLoading] = useState(false);
  const [filteredLocations, setFilteredLocations] =
    useState<MockLocation[]>([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<AutocompletePrediction[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [placesSearchLoading, setPlacesSearchLoading] = useState(false);
  const restaurantServiceRef = useRef<RestaurantService | null>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingPlaceRef = useRef(false);
  const modalizeRef = useRef<Modalize>(null);
  const [macroData, setMacroData] = useState<MacroData[]>(defaultMacroData);
  const [_consumed, setConsumed] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  });
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const mapSearchInputRef = useRef<TextInput>(null);
  const listSearchInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const isDataLoaded = !locationLoading && meals.length > 0;
  const posthog = usePosthog();

  useEffect(() => {
    posthog?.track({
      name: 'meal_finder_screen_viewed',
      properties: {
        $screen_name: 'MealFinderScreen',
        $current_url: 'MealFinderScreen',
        entry_point: 'meal_finder',
        macros: macrosPreferences,
        view_type: activeTab,
      },
    });
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const progressData = await mealService.getDailyProgress();

        const consumedValues = {
          protein: progressData.logged_macros.protein || 0,
          carbs: progressData.logged_macros.carbs || 0,
          fat: progressData.logged_macros.fat || 0,
          calories: progressData.logged_macros.calories || 0,
        };
        setConsumed(consumedValues);

        setMacroData([
          { label: 'Protein', value: consumedValues.protein, color: '#6C5CE7' },
          { label: 'Carbs', value: consumedValues.carbs, color: '#FFC107' },
          { label: 'Fat', value: consumedValues.fat, color: '#FF69B4' },
        ]);
      } catch (error) {
        console.error('Error fetching progress:', error);
        // Don't set error for progress data - just use default values
        setConsumed({
          protein: 0,
          carbs: 0,
          fat: 0,
          calories: 0,
        });
        setMacroData([
          { label: 'Protein', value: 0, color: '#6C5CE7' },
          { label: 'Carbs', value: 0, color: '#FFC107' },
          { label: 'Fat', value: 0, color: '#FF69B4' },
        ]);
      }
    };

    fetchProgress();
  }, [token]);



const handleLocationPermission = async (): Promise<boolean> => {
      const hasPermission = await locationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Location access is needed to find nearby meals. Please enable location services in your device settings.',
          [
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
            {
              text: 'Settings',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        // setInitializing(false);
         return false; 
  }
  
  return true; 
};


  const fetchLocationAndSuggestions = async () => {
    // setInitializing(true);
    try {
      // 1. Get location
    
      const location = await locationService.getCurrentLocation();
      if (location) {
        const address = await locationService.reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );
        const shortAddress = address.split(',')[0].trim();
        setCurrentLocation(address);
        setSelectedLocation(shortAddress);

        // Store coordinates for map
        setCurrentLocationCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Skip if no coordinates
        if (
          typeof location.coords.latitude !== 'number' ||
          typeof location.coords.longitude !== 'number'
        ) {
          setError('Location coordinates not available');
          setLocationLoading(false);
          return;
        }

        // 2. Fetch map pins
        setLocationLoading(true);
        try {
          const mapPinsResponse = await mealService.getMapPins(
            location.coords.latitude,
            location.coords.longitude,
            undefined,
            undefined,
           
          );
          // Keep only restaurants within ~50km of the user (based on API distance_km)
          const pins = (mapPinsResponse.pins || []).filter(
            (pin: any) =>
              typeof pin.distance_km !== 'number' || pin.distance_km <= 50
          );
          const mealList: Meal[] = pins.map((pin: any) => ({
            id: pin.id || pin.google_place_id || String(Math.random()),
            name: pin.top_meal?.name || '',
            macros: {
              calories: pin.top_meal?.macros?.calories || 0,
              carbs: pin.top_meal?.macros?.carbs || 0,
              fat: pin.top_meal?.macros?.fat || 0,
              protein: pin.top_meal?.macros?.protein || 0,
            },
            restaurant: {
              name: pin.name || '',
              location: pin.address || '',
            },
            imageUrl: pin.photo_url || undefined,
            description: pin.top_meal?.description || '',
            price: pin.price_level || undefined,
            distance: pin.distance_km || undefined,
            date: new Date().toDateString(),
            mealType: 'lunch',
            matchScore: pin.top_meal?.match_score || 0,
            latitude: pin.latitude,
            longitude: pin.longitude,
          }));
          setMeals(mealList);
          setError(null);
        } catch (apiError: any) {
          console.error('API Error:', apiError);
          setError('Failed to fetch restaurant locations.');
          setMeals([]);
        } finally {
          setLocationLoading(false);
        }
      } else {
        setCurrentLocation('Location unavailable');
        setSelectedLocation('Location unavailable');
        setMeals([]);
      }
    } catch (error) {
      console.error('Location Error:', error);
      setCurrentLocation('Location unavailable');
      setSelectedLocation('Location unavailable');
      setMeals([]);
    }
  };

  const handleRetry = () => {
    fetchLocationAndSuggestions();
  };

  const handleScrollBegin = () => {
    if (activeTab === 'list') {
      Animated.timing(tabOpacity, {
        toValue: 0.2,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleScrollEnd = () => {
    if (activeTab === 'list') {
      Animated.timing(tabOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    fetchLocationAndSuggestions();
  }, []);

  // Reset tab opacity when switching tabs
  useEffect(() => {
    Animated.timing(tabOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabOpacity]);

  useEffect(() => {
    const list = search.trim() === ''
      ? nearbyPlaces
      : nearbyPlaces.filter(
          loc =>
            (loc.label && loc.label.toLowerCase().includes(search.toLowerCase())) ||
            (loc.description && loc.description.toLowerCase().includes(search.toLowerCase()))
        );
    setFilteredLocations(list);
  }, [search, nearbyPlaces]);

  const fetchNearbyPlaces = useCallback(async () => {
    if (!currentLocationCoords || !restaurantServiceRef.current) return;
    setNearbyPlacesLoading(true);
    try {
      const restaurants = await restaurantServiceRef.current.searchNearbyRestaurants(
        currentLocationCoords,
        { radius: 5000, type: 'restaurant' }
      );
      const places: MockLocation[] = restaurants.map((r: any) => ({
        label: r.name,
        description: r.vicinity || '',
        latitude: r.location?.latitude,
        longitude: r.location?.longitude,
      })).filter((p: MockLocation) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
      setNearbyPlaces(places);
      setFilteredLocations(places);
    } catch (err) {
      console.error('[MealFinder] Nearby places error:', err);
      setNearbyPlaces([]);
      setFilteredLocations([]);
    } finally {
      setNearbyPlacesLoading(false);
    }
  }, [currentLocationCoords]);

  useEffect(() => {
    if (!currentLocationCoords) {
      setNearbyPlaces([]);
      setFilteredLocations([]);
      return;
    }
    if (restaurantServiceRef.current) {
      fetchNearbyPlaces();
    }
  }, [currentLocationCoords, fetchNearbyPlaces]);

  const initRestaurantService = useCallback(() => {
    if (restaurantServiceRef.current) return true;
    try {
      if (!MapsService.getIsInitialized()) return false;
      const apiKey = MapsService.getApiKey();
      if (apiKey) {
        restaurantServiceRef.current = new RestaurantService(apiKey);
        return true;
      }
    } catch (e) {
      console.error('[MealFinder] RestaurantService init error:', e);
    }
    return false;
  }, []);

  useEffect(() => {
    if (MapsService.getIsInitialized()) {
      if (initRestaurantService() && currentLocationCoords) {
        fetchNearbyPlaces();
      }
    }
  }, [initRestaurantService, currentLocationCoords, fetchNearbyPlaces]);

  const fetchPlaceSuggestions = useCallback(async (input: string) => {
    if (!input || input.trim().length < 2) {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      return;
    }
    if (!restaurantServiceRef.current) {
      if (!initRestaurantService()) return;
    }
    if (!restaurantServiceRef.current) return;
    try {
      setPlacesSearchLoading(true);
      const predictions = await restaurantServiceRef.current.getAutocompletePredictions(
        input.trim(),
        'geocode|establishment'
      );
      setPlaceSuggestions(predictions);
      setShowPlaceSuggestions(predictions.length > 0);
    } catch (err) {
      console.error('[MealFinder] Places autocomplete error:', err);
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
    } finally {
      setPlacesSearchLoading(false);
    }
  }, [initRestaurantService]);

  const handleAddressSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
      if (text.trim().length < 2) {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
        return;
      }
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchPlaceSuggestions(text);
      }, 300);
    },
    [fetchPlaceSuggestions]
  );

  const handleSelectPlace = useCallback(
    async (prediction: AutocompletePrediction) => {
      isSelectingPlaceRef.current = true;
      setShowPlaceSuggestions(false);
      setPlaceSuggestions([]);
      setSearch(prediction.description);
      setSelectedLocation(prediction.description);
      modalizeRef.current?.close();
      setLocationLoading(true);

      if (!restaurantServiceRef.current) {
        isSelectingPlaceRef.current = false;
        setLocationLoading(false);
        return;
      }
      const coords = await restaurantServiceRef.current.getPlaceCoordinates(prediction.place_id);
      setTimeout(() => {
        isSelectingPlaceRef.current = false;
      }, 300);

      if (!coords) {
        setError('Could not get coordinates for this place.');
        setLocationLoading(false);
        return;
      }

      setCurrentLocationCoords({ latitude: coords.latitude, longitude: coords.longitude });

      try {
        const mapPinsResponse = await mealService.getMapPins(
          coords.latitude,
          coords.longitude,
          undefined,
          undefined
        );
        const pins = (mapPinsResponse.pins || []).filter(
          (pin: any) =>
            typeof pin.distance_km !== 'number' || pin.distance_km <= 50
        );
        const mealList: Meal[] = pins.map((pin: any) => ({
          id: pin.id || pin.google_place_id || String(Math.random()),
          name: pin.top_meal?.name || '',
          macros: {
            calories: pin.top_meal?.macros?.calories || 0,
            carbs: pin.top_meal?.macros?.carbs || 0,
            fat: pin.top_meal?.macros?.fat || 0,
            protein: pin.top_meal?.macros?.protein || 0,
          },
          restaurant: {
            name: pin.name || '',
            location: pin.address || '',
          },
          imageUrl: pin.photo_url || undefined,
          description: pin.top_meal?.description || '',
          price: pin.price_level || undefined,
          distance: pin.distance_km || undefined,
          date: new Date().toDateString(),
          mealType: 'lunch',
          matchScore: pin.top_meal?.match_score || 0,
          latitude: pin.latitude,
          longitude: pin.longitude,
        }));
        setMeals(mealList);
        setError(null);
      } catch (apiError: any) {
        console.error('[MealFinder] API error after place select:', apiError);
        setError('Failed to fetch restaurant locations.');
        setMeals([]);
      } finally {
        setLocationLoading(false);
      }
    },
    []
  );

  const openLocationSheet = useCallback(() => {
    modalizeRef.current?.open();
  }, []);

  const closeLocationSheet = useCallback(() => {
    modalizeRef.current?.close();
  }, []);

  const handleSearchFocus = useCallback(() => {
    // Blur the input before navigating to prevent focus loop
    mapSearchInputRef.current?.blur();
    listSearchInputRef.current?.blur();
    // Small delay to ensure blur completes before navigation
    setTimeout(() => {
      navigation.navigate('SearchMealAndRestaurants', {
        defaultResults: meals,
      });
    }, 100);
    posthog?.track({
      name: 'search_bar_engaged',
      properties: {
        $screen_name: 'MealFinderScreen',
        $current_url: 'MealFinderScreen',
        entry_point: 'meal_finder_screen',
      },
    });
  }, [navigation, meals, posthog]);

  const handleSelectCurrentLocation = async () => {
    closeLocationSheet();
    setLocationLoading(true);
    const permissionGranted:boolean = await handleLocationPermission();
    if (permissionGranted) {
      await fetchLocationAndSuggestions();
    }
    setLocationLoading(false);
  };

  const handleSelectMockLocation = async (location: MockLocation) => {
    setSelectedLocation(location.label);
    closeLocationSheet();
    setLocationLoading(true);

    // Skip if no coordinates
    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      setError('Location coordinates not available');
      setLocationLoading(false);
      return;
    }

    // Store coordinates for map
    setCurrentLocationCoords({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    try {
      const mapPinsResponse = await mealService.getMapPins(
        location.latitude,
        location.longitude,
        undefined,
        undefined,
      );
      // Keep only restaurants within ~50km of the selected location
      const pins = (mapPinsResponse.pins || []).filter(
        (pin: any) =>
          typeof pin.distance_km !== 'number' || pin.distance_km <= 50
      );
      const mealList: Meal[] = pins.map((pin: any) => ({
        id: pin.id || pin.google_place_id || String(Math.random()),
        name: pin.top_meal?.name || '',
        macros: {
          calories: pin.top_meal?.macros?.calories || 0,
          carbs: pin.top_meal?.macros?.carbs || 0,
          fat: pin.top_meal?.macros?.fat || 0,
          protein: pin.top_meal?.macros?.protein || 0,
        },
        restaurant: {
          name: pin.name || '',
          location: pin.address || '',
        },
        imageUrl: pin.photo_url || undefined,
        description: pin.top_meal?.description || '',
        price: pin.price_level || undefined,
        distance: pin.distance_km || undefined,
       date: new Date().toDateString(),
        mealType: 'lunch',
        matchScore: pin.top_meal?.match_score || 0,
        latitude: pin.latitude,
        longitude: pin.longitude,
      }));
      setMeals(mealList);
      setError(null);
    } catch (apiError: any) {
      console.error('API Error:', apiError);
      setError('Failed to fetch restaurant locations.');
      setMeals([]);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    // <CustomSafeAreaView edges={['left', 'right', 'top']} className="flex-1">
    <View className="flex-1">
      {/* Map Background - Only show when Map tab is active */}
      {activeTab === 'map' && (
        <View className="absolute inset-0">
          <MealFinderMapView
            meals={meals}
            locationLoading={locationLoading}
            error={error}
            onRetry={handleRetry}
            navigation={navigation}
            currentLocation={currentLocationCoords || undefined}
            defaultDate={defaultDate}
          />
        </View>
      )}

      {/* Header - Transparent when Map tab is active */}
      <View
        className={`flex-row items-center justify-between px-5 pb-5 pt-10 ${
          activeTab === 'map' ? 'bg-transparent' : 'bg-white'
        }`}
        style={{ paddingTop: Platform.OS === 'android' ? 8 : 50 }}
      >
        <TouchableOpacity
          onPress={() => {
            posthog?.track({
              name: 'meal_finder_back_to_add_meal',
              properties: {
                $screen_name: 'MealFinderScreen',
                $current_url: 'MealFinderScreen',
                gesture: 'button',
              },
            });
            navigation.goBack();
          }}
          className={`flex-row w-8 h-8 rounded-full bg-white justify-center items-center`}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            className={`text-[22px] text-black`}
          ></Ionicons>
        </TouchableOpacity>
        <Text
          className={`text-[20px] font-semibold text-center ${
            isDarkMode ? 'text-white' : 'text-[#222]'
          }`}
        >
          Meal Finder
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar - Only show when Map tab is active and data has loaded */}
      {activeTab === 'map' && isDataLoaded && (
        
        <View className="px-5">
          <View className="flex-row items-center bg-white/90 rounded-3xl px-4 py-3 shadow-lg">
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              ref={mapSearchInputRef}
              placeholder="Search meals and restaurants"
              className="flex-1 ml-3 placeholder:text-xs placeholder:text-[#4F4F4FCC]"
              placeholderTextColor="#888"
              onFocus={handleSearchFocus}
            />
            <Image source={IMAGE_CONSTANTS.mapFilterIcon} className="w-5 h-5" />
          </View>
        </View>
      )}

      {/* List View - show when List tab is active (content shows loading/error/meals) */}
      {activeTab === 'list' && (
        <View className="flex-1 px-5 mt-8">
          {/* Search Bar for List Tab */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white px-4 py-3 shadow-sm rounded-3xl">
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                ref={listSearchInputRef}
                placeholder="Search meals and restaurants"
                className="flex-1 ml-3 placeholder:text-xs placeholder:text-[#4F4F4FCC]"
                placeholderTextColor="#888"
                onFocus={handleSearchFocus}
              />
              <Image
                source={IMAGE_CONSTANTS.mapFilterIcon}
                className="w-5 h-5"
              />
            </View>
          </View>

          <View className="flex-row items-center mb-5 gap-2">
            <Image
              source={IMAGE_CONSTANTS.locationGray}
              className="w-[40px] h-[40px] rounded-full"
            />
            <TouchableOpacity
              onPress={openLocationSheet}
              className="flex-col flex-1 items-start"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium text-[#222]">
                Current location
              </Text>
              <View className="flex-row items-center">
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#01675B" style={{ marginRight: 8 }} />
                ) : null}
                <Text className="mt-2 text-base font-semibold text-primary mr-1">
                  {locationLoading ? 'Loading…' : selectedLocation}
                </Text>
                {!locationLoading && (
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color="#222"
                    className="mt-2"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Remaining Today Section - Only show on List tab */}
          <View className="mb-4">
            <RemainingTodayView
              macroData={macroData}
              macrosPreferences={macrosPreferences}
            />
          </View>

          <MealFinderListView
            meals={meals}
            locationLoading={locationLoading}
            error={error}
            onRetry={handleRetry}
            navigation={navigation}
            onScrollBegin={handleScrollBegin}
            onScrollEnd={handleScrollEnd}
            defaultDate={defaultDate}
          />
        </View>
      )}

      {/* Remaining Today Section - Only show on Map tab */}
      {activeTab === 'map' && (
        <View className="px-5 mb-4">
          <RemainingTodayView
            macroData={macroData}
            macrosPreferences={macrosPreferences}
          />
        </View>
      )}

      {/* Bottom Tab Navigation */}
      <View className="absolute bottom-0 left-0 right-0 pb-6 px-4">
        <Animated.View
          className={`flex-row ${Platform.OS === 'ios' ? 'bg-white rounded-[1000px] p-1 shadow-lg' : 'bg-white rounded-2xl p-1'} mx-4`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            opacity: tabOpacity,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (activeTab !== 'map') {
                posthog?.track({
                  name: 'viewed_type_toggled',
                  properties: {
                    $screen_name: 'MealFinderScreen',
                    $current_url: 'MealFinderScreen',
                    from_view: activeTab,
                    to_view: 'map',
                  },
                });
              }
              setActiveTab('map');
            }}
            className={`flex-1 py-3 rounded-[1000px] ${
              activeTab === 'map'
                ? 'bg-[#01675B1A] rounded-[96px] text-primary'
                : 'bg-transparent'
            }`}
          >
            <View className="flex-col items-center justify-center">
              <Ionicons
                name={activeTab === 'map' ? 'map' : 'map-outline'}
                size={20}
                color={activeTab === 'map' ? '#01675B' : '#666'}
              />
              <Text
                className={`ml-2 font-medium ${
                  activeTab === 'map' ? 'text-primary' : 'text-gray-600'
                }`}
              >
                Map
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (activeTab !== 'list') {
                posthog?.track({
                  name: 'viewed_type_toggled',
                  properties: {
                    $screen_name: 'MealFinderScreen',
                    $current_url: 'MealFinderScreen',
                    from_view: activeTab,
                    to_view: 'list',
                  },
                });
              }
              setActiveTab('list');
            }}
            className={`flex-1 py-3 rounded-[96px] ${
              activeTab === 'list'
                ? 'bg-[#01675B1A] rounded-[96px]'
                : 'bg-transparent'
            }`}
          >
            <View className="flex-col items-center justify-center">
              <Ionicons
                name={activeTab === 'list' ? 'list' : 'list-outline'}
                size={20}
                color={activeTab === 'list' ? '#01675B' : '#666'}
              />
              <Text
                className={`ml-2 font-medium ${
                  activeTab === 'list' ? 'text-primary' : 'text-gray-600'
                }`}
              >
                List
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Location Selection Modal */}
      <Modalize
        ref={modalizeRef}
        modalHeight={SCREEN_HEIGHT * 0.6}
        handlePosition="inside"
        withHandle={true}
        modalStyle={{
          backgroundColor: '#fff',
          padding: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          margin: 0,
        }}
      >
        <View className="px-5 pt-2 pb-5">
          <Text className="font-semibold text-lg mt-8 mb-4">
            Delivery address
          </Text>
          <View className="flex-row items-center mb-4 bg-gray-100 rounded-lg px-3">
            <Ionicons
              name="search"
              size={18}
              color="#888"
              style={{ marginRight: 6 }}
            />
            <TextInput
              placeholder="Search for an address or place"
              value={search}
              onChangeText={handleAddressSearchChange}
              className="flex-1 h-[48px] rounded-2xl text-base text-[#222]"
              placeholderTextColor="#888"
            />
            {placesSearchLoading && (
              <ActivityIndicator size="small" color="#01675B" style={{ marginLeft: 8 }} />
            )}
          </View>
          <TouchableOpacity
            onPress={handleSelectCurrentLocation}
            className="flex-row items-center mb-5"
          >
            <Image
              source={IMAGE_CONSTANTS.nearbyLocationIcon}
              className="w-[14px] h-[14px] rounded-full"
            />
            <Text className="text-primary ml-3 font-medium underline">
              Use your current location
            </Text>
          </TouchableOpacity>
          {showPlaceSuggestions && placeSuggestions.length > 0 ? (
            <>
              <Text className="text-mediumGrey text-xs mb-2">Suggestions</Text>
              {placeSuggestions.map((prediction, idx) => (
                <React.Fragment key={prediction.place_id}>
                  <TouchableOpacity
                    onPress={() => handleSelectPlace(prediction)}
                    className="flex-row items-center py-3"
                  >
                    <Image
                      source={IMAGE_CONSTANTS.locationIcon}
                      className="w-[32px] h-[32px] mr-4 rounded-full"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-[#222]">
                        {prediction.structured_formatting?.main_text || prediction.description}
                      </Text>
                      {prediction.structured_formatting?.secondary_text ? (
                        <Text className="text-mediumGrey text-xs">
                          {prediction.structured_formatting.secondary_text}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  {idx !== placeSuggestions.length - 1 && (
                    <View className="h-px bg-gray-200" />
                  )}
                </React.Fragment>
              ))}
              <View className="h-px bg-gray-200 my-4" />
            </>
          ) : null}
          {!currentLocationCoords ? (
            <Text className="text-mediumGrey text-sm py-4">
              Enable location to see nearby places
            </Text>
          ) : nearbyPlacesLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#01675B" />
              <Text className="text-mediumGrey text-sm mt-2">Loading nearby places…</Text>
            </View>
          ) : filteredLocations.length === 0 ? (
            <Text className="text-mediumGrey text-sm py-4">
              No restaurants found nearby
            </Text>
          ) : (
            filteredLocations.map((loc, idx) => (
              <React.Fragment key={`${loc.latitude}-${loc.longitude}-${idx}`}>
                <TouchableOpacity
                  onPress={() => handleSelectMockLocation(loc)}
                  className="flex-row items-center"
                >
                  <Image
                    source={IMAGE_CONSTANTS.locationIcon}
                    className="w-[32px] h-[32px] mr-4 rounded-full"
                  />
                  <View>
                    <Text className="text-sm font-medium text-[#222]">
                      {loc.label}
                    </Text>
                    <Text className="text-mediumGrey text-xs">
                      {loc.description}
                    </Text>
                  </View>
                </TouchableOpacity>
                {idx !== filteredLocations.length - 1 && (
                  <View className="h-px bg-gray-200 my-5" />
                )}
              </React.Fragment>
            ))
          )}
        </View>
      </Modalize>
    </View>
    // </CustomSafeAreaView>
  );
};

export default MealFinderScreen;
