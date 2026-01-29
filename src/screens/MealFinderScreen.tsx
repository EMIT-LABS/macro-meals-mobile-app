import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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

const mockLocations: MockLocation[] = [
  {
    label: 'Eiffel Tower',
    description: 'Champ de Mars, Paris, France',
    latitude: 48.8584,
    longitude: 2.2945,
  },
  {
    label: 'Sydney Opera House',
    description: 'Bennelong Point, Sydney NSW, Australia',
    latitude: -33.8568,
    longitude: 151.2153,
  },
  {
    label: 'Shibuya Crossing',
    description: 'Shibuya City, Tokyo, Japan',
    latitude: 35.6595,
    longitude: 139.7005,
  },
  {
    label: 'Table Mountain',
    description: 'Cape Town, South Africa',
    latitude: -33.9628,
    longitude: 18.4098,
  },
  {
    label: 'Kakum National Park',
    description: 'Rainforest canopy walkway, Central Region, Ghana',
    latitude: 5.4107,
    longitude: -1.2732,
  },
  {
    label: 'Cape Coast Castle',
    description: 'Historic slave castle, Cape Coast, Ghana',
    latitude: 5.1036,
    longitude: -1.2466,
  },
  {
    label: 'Kwame Nkrumah Mausoleum',
    description: 'Memorial park, Accra, Ghana',
    latitude: 5.556,
    longitude: -0.1969,
  },
  {
    label: 'Labadi Beach',
    description: 'Popular beach, Accra, Ghana',
    latitude: 5.5586,
    longitude: -0.1635,
  },
  {
    label: 'Kumasi Central Market',
    description: 'Large open-air market, Kumasi, Ghana',
    latitude: 6.693,
    longitude: -1.6244,
  },
  {
    label: 'Lake Bosomtwe',
    description: 'Crater lake, Ashanti Region, Ghana',
    latitude: 6.5053,
    longitude: -1.4187,
  },
  {
    label: 'Independence Arch',
    description: 'Iconic monument, Accra, Ghana',
    latitude: 5.5502,
    longitude: -0.1921,
  },
  {
    label: 'Elmina Castle',
    description: 'Historic castle, Elmina, Ghana',
    latitude: 5.0847,
    longitude: -1.3509,
  },
  {
    label: 'Mole National Park',
    description: 'Wildlife reserve, Northern Region, Ghana',
    latitude: 9.7036,
    longitude: -1.8032,
  },
  {
    label: 'Wli Waterfalls',
    description: 'Tallest waterfall in Ghana, Volta Region',
    latitude: 7.1306,
    longitude: 0.5736,
  },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const defaultMacroData: MacroData[] = [
  { label: 'Protein', value: 0, color: '#6C5CE7' },
  { label: 'Carbs', value: 0, color: '#FFC107' },
  { label: 'Fat', value: 0, color: '#FF69B4' },
];

type TabType = 'list' | 'map';

const MealFinderScreen: React.FC = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'MealFinderScreen'>
    >();
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
  const [filteredLocations, setFilteredLocations] =
    useState<MockLocation[]>(mockLocations);
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
  const posthog=usePosthog()

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

  const fetchLocationAndSuggestions = async () => {
    // setInitializing(true);
    try {
      // 1. Get location
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
        return;
      }
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
            location.coords.longitude
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
            date: new Date().toISOString(),
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
    setFilteredLocations(
      search.trim() === ''
        ? mockLocations
        : mockLocations.filter(
            loc =>
              loc.label.toLowerCase().includes(search.toLowerCase()) ||
              loc.description.toLowerCase().includes(search.toLowerCase())
          )
    );
  }, [search]);

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
  }, [navigation, meals]);

  const handleSelectCurrentLocation = async () => {
    closeLocationSheet();
    setLocationLoading(true);
    // await handleLocationPermission();
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
        location.longitude
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
        date: new Date().toISOString(),
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
          onPress={() => {navigation.goBack(),
            posthog.track({
              name:'meal_finder_back_to_add_meal',
              properties:{
                gesture:'button'
              }
            })
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

      {/* List View - Only show when List tab is active and data has loaded */}
      {activeTab === 'list' && isDataLoaded && (
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
                <Text className="mt-2 text-base font-semibold text-primary mr-1">
                  {selectedLocation}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="#222"
                  className="mt-2"
                />
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
            onPress={() => setActiveTab('map')}
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
            onPress={() => setActiveTab('list')}
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
              placeholder="Enter a new address"
              value={search}
              onChangeText={setSearch}
              className="flex-1 h-[48px] rounded-2xl text-base text-[#222]"
              placeholderTextColor="#888"
            />
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
          {filteredLocations.map((loc, idx) => (
            <React.Fragment key={idx}>
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
          ))}
        </View>
      </Modalize>
    </View>
    // </CustomSafeAreaView>
  );
};

export default MealFinderScreen;
