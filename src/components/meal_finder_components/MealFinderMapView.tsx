import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { RootStackParamList } from 'src/types/navigation';
import { GenericMapView } from '../../../packages/maps_service/src/GenericMapView';
import { MapBounds, MapMarker } from '../../../packages/maps_service/src/types';
import { useMap } from '../../../packages/maps_service/src/useMap';
import { Meal } from '../../types';

interface MealFinderMapViewProps {
  meals: Meal[];
  locationLoading: boolean;
  error: string | null;
  onRetry: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'MealFinderScreen'>;
  currentLocation?: { latitude: number; longitude: number };
  defaultDate?: string; 

}

// Default fallback bounds (San Francisco)
const DEFAULT_BOUNDS: MapBounds = {
  northEast: { latitude: 37.8324, longitude: -122.3482 },
  southWest: { latitude: 37.7049, longitude: -122.5273 },
};

export const MealFinderMapView: React.FC<MealFinderMapViewProps> = ({
  meals,
  locationLoading,
  error,
  onRetry,
  navigation,
  currentLocation,
  defaultDate,

}) => {
  const { selectedMarker, selectMarker } = useMap<Meal>();

  // Create dynamic bounds around current location
  const getBoundsForLocation = (location?: {
    latitude: number;
    longitude: number;
  }) => {
    if (!location) return DEFAULT_BOUNDS; // Default fallback if no location

    // Create a 50km radius around the current location
    const radius = 0.45; // Approximately 50km
    return {
      northEast: {
        latitude: location.latitude + radius,
        longitude: location.longitude + radius,
      },
      southWest: {
        latitude: location.latitude - radius,
        longitude: location.longitude - radius,
      },
    };
  };

  const currentBounds = getBoundsForLocation(currentLocation);

  const handleCalloutPress = (marker: MapMarker<Meal>) => {
    // Don't handle callout press for current location marker
    if (marker.id === 'current-location') {
      return;
    }

    selectMarker(marker);
    navigation.navigate('MealFinderBreakdownScreen', { meal: marker.data, defaultDate });
  };

  // Convert meals to map markers with actual coordinates
  const mealMarkers: MapMarker<Meal>[] = React.useMemo(() => {
    const markers = meals.map((meal, index) => {
      // Use actual coordinates from meal if available, otherwise fallback to generated coordinates
      let lat: number;
      let lng: number;

      if (meal.latitude && meal.longitude) {
        // Use actual coordinates from the pin
        lat = meal.latitude;
        lng = meal.longitude;
      } else {
        // Fallback: Generate stable coordinates based on meal ID (for backward compatibility)
        const centerLat = currentLocation?.latitude || 37.78825;
        const centerLng = currentLocation?.longitude || -122.4324;
        const seed = meal.id
          ? meal.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
          : index;
        const random1 = (Math.sin(seed) + 1) / 2; // Convert to 0-1 range
        const random2 = (Math.sin(seed * 2) + 1) / 2; // Different pattern

        lat = Math.max(
          currentBounds.southWest.latitude + 0.001,
          Math.min(
            currentBounds.northEast.latitude - 0.001,
            centerLat + (random1 - 0.5) * 0.003
          )
        );
        lng = Math.max(
          currentBounds.southWest.longitude + 0.001,
          Math.min(
            currentBounds.northEast.longitude - 0.001,
            centerLng + (random2 - 0.5) * 0.003
          )
        );
      }

      return {
        id: meal.id || `meal-${index}`,
        coordinate: { latitude: lat, longitude: lng },
        title: meal.name,
        description: meal.restaurant.name,
        data: meal,
        color: meal.matchScore && meal.matchScore > 80 ? '#10b981' : '#6b7280',
        icon: 'restaurant',
        size: 'medium' as const,
      };
    });

    // Add current location marker if available
    if (currentLocation) {
      markers.push({
        id: 'current-location',
        coordinate: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        title: 'Your Location',
        description: 'Current location',
        data: null as any, // No meal data for current location
        color: '#3b82f6', // Blue color for current location
        icon: 'location',
        size: 'medium' as const,
      });
    }

    return markers;
  }, [meals, currentLocation, currentBounds]);

  const customMarkerRenderer = (marker: MapMarker<Meal>) => {
    // Special renderer for current location
    if (marker.id === 'current-location') {
      return (
        <View className="items-center" style={{ overflow: 'visible' }}>
          <View
            className="bg-blue-500 rounded-full shadow-lg border-2 border-white items-center justify-center"
            style={{ width: 24, height: 24, overflow: 'visible' }}
          >
            <Ionicons name="location" size={14} color="white" />
          </View>
          <View className="bg-blue-500 rounded-full w-2 h-2 mt-1" />
        </View>
      );
    }

    // Default renderer for meal markers
    return (
      <View className="items-center">
        <View className="rounded-full shadow-lg items-center justify-center bg-primary w-8 h-8">
          <Image
            source={IMAGE_CONSTANTS.restaurantPinIcon}
            className="w-[10px] h-[13px]"
            resizeMode="contain"
          />
        </View>
        {Platform.OS !== 'android' &&
          marker.data?.matchScore &&
          marker.data.matchScore > 0 && (
            <View className="bg-primary rounded-full px-2 py-1 mt-1">
              <Text className="text-white text-xs font-bold">
                {marker.data.matchScore}%
              </Text>
            </View>
          )}
      </View>
    );
  };

  const customCalloutRenderer = (marker: MapMarker<Meal>) => {
    // Don't show callout for current location
    if (marker.id === 'current-location') {
      return null;
    }

    return (
      <View className="flex-row items-center bg-primary rounded-lg p-3 gap-1 shadow-lg min-w-[220px] max-w-[260px]">
        <Image
          tintColor={'white'}
          source={IMAGE_CONSTANTS.restaurantIcon}
          className="w-4 h-4 mr-2"
        />
        <View className="flex-1 flex-col">
          <Text
            className="text-sm text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {marker.data?.restaurant?.name || 'Restaurant'}
          </Text>

          <View className="flex-row items-center">
            <Text
              className="text-xs font-semibold text-white flex-shrink"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ maxWidth: 200 }}
            >
              {marker.data?.name || 'Meal'}
            </Text>
            <View className="items-center flex-row mx-1 bg-white rounded-full h-[5px] w-[5px]"></View>
            {/* Match Score */}
            {Platform.OS !== 'android' &&
              marker.data?.matchScore &&
              marker.data.matchScore > 0 && (
                <View className="flex-row items-center">
                  <View className="bg-primary rounded-full px-1">
                    <Text className="text-white text-xs font-bold">
                      {marker.data.matchScore}%
                    </Text>
                  </View>
                </View>
              )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="white" />
      </View>
    );
  };

  return (
    <View className="flex-1">
      <GenericMapView
        markers={mealMarkers}
        loading={locationLoading}
        error={error}
        onRetry={onRetry}
        customMarkerRenderer={customMarkerRenderer}
        customCalloutRenderer={customCalloutRenderer}
        selectedMarker={selectedMarker}
        onMarkerSelect={selectMarker}
        onMarkerPress={marker => {
          // Only handle meal markers, not current location
          if (marker.id !== 'current-location') {
            console.log('Marker pressed:', marker.data?.name);
          }
        }}
        onCalloutPress={handleCalloutPress}
        restrictToBounds={currentBounds}
        minZoomLevel={10}
        maxZoomLevel={18}
        onRegionChangeComplete={region => {
          console.log('Region changed to:', region);
        }}
      />

      {/* Selected Meal Info Card */}
      {selectedMarker && selectedMarker.data && (
        <View className="absolute bottom-[110px] left-4 right-4 bg-white rounded-xl p-4 shadow-lg">
          <Pressable
            className="flex-row items-start"
            onPress={() => {
              console.log('Selected marker:', selectedMarker);
              if (selectedMarker && selectedMarker.data) {
                navigation.navigate('MealFinderBreakdownScreen', {
                  meal: selectedMarker.data,defaultDate
                });
              }
            }}
          >
            <View className="rounded-full items-center justify-center mr-1">
              <Image
                source={IMAGE_CONSTANTS.mealIcon}
                className="w-12 h-12"
                resizeMode="contain"
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-semibold text-gray-900"
                numberOfLines={1}
              >
                {selectedMarker.data?.name || 'Meal'}
              </Text>
              <Text className="text-xs text-gray-600" numberOfLines={1}>
                {selectedMarker.data?.restaurant?.name || 'Restaurant'}
              </Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-row items-center mr-4">
                  <View className="w-4 h-4 bg-amber rounded-full items-center justify-center mr-1">
                    <Text className="text-white text-xs font-bold">C</Text>
                  </View>
                  <Text className="text-xs text-gray-600">
                    {selectedMarker.data?.macros?.carbs || 0}g 
                  </Text>
                </View>
                <View className="flex-row items-center mr-4">
                  <View className="w-4 h-4 bg-lavenderPink rounded-full items-center justify-center mr-1">
                    <Text className="text-white text-xs font-bold">F</Text>
                  </View>
                  <Text className="text-xs text-gray-600">
                    {selectedMarker.data?.macros?.fat || 0}g
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-4 h-4 bg-gloomyPurple rounded-full items-center justify-center mr-1">
                    <Text className="text-white text-xs font-bold">P</Text>
                  </View>
                  <Text className="text-xs text-gray-600">
                    {selectedMarker.data?.macros?.protein || 0}g
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                selectMarker(null);
              }}
              className="ml-2"
            >
              <Text className="text-gray-500 text-lg">×</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      )}
    </View>
  );
};
