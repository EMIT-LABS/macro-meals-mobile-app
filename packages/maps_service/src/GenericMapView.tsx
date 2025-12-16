import { Ionicons } from '@expo/vector-icons';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
  Region,
} from 'react-native-maps';
import { GenericMapProps, MapMarker, MapRegion } from './types';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005; // Very zoomed in for detailed local view
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GenericMapViewComponent = <T = any,>({
  markers,
  region,
  onMarkerPress,
  onRegionChange,
  onCalloutPress,
  showUserLocation: _showUserLocation = true,
  showMyLocationButton: _showMyLocationButton = true,
  showCompass: _showCompass = true,
  showScale: _showScale = true,
  mapType: _mapType = 'standard',
  loading = false,
  error = null,
  onRetry,
  customMarkerRenderer,
  customCalloutRenderer,
  selectedMarker: _selectedMarker,
  onMarkerSelect,
  restrictToBounds,
  minZoomLevel,
  maxZoomLevel,
  onRegionChangeComplete,
}: GenericMapProps<T>) => {
  // Removed excessive logging to prevent performance issues
  const mapRef = useRef<any>(null);
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>(
    region || {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }
  );

  // Update the region when markers change
  useEffect(() => {
    if (markers.length > 0 && !region) {
      const coordinates = markers.map(marker => marker.coordinate);
      const minLat = Math.min(...coordinates.map(coord => coord.latitude));
      const maxLat = Math.max(...coordinates.map(coord => coord.latitude));
      const minLng = Math.min(...coordinates.map(coord => coord.longitude));
      const maxLng = Math.max(...coordinates.map(coord => coord.longitude));

      const newRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + 0.002, LATITUDE_DELTA),
        longitudeDelta: Math.max(maxLng - minLng + 0.002, LONGITUDE_DELTA),
      };

      setMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  }, [markers, region]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }
    };
  }, []);

  const handleMarkerPress = useCallback(
    (marker: MapMarker<T>) => {
      onMarkerPress?.(marker);
      onMarkerSelect?.(marker);
    },
    [onMarkerPress, onMarkerSelect]
  );

  // Clamp region to bounds if restriction is enabled
  const clampRegionToBounds = useCallback(
    (region: MapRegion) => {
      if (!restrictToBounds) return region;

      const clampedRegion = { ...region };

      // Clamp latitude
      clampedRegion.latitude = Math.max(
        restrictToBounds.southWest.latitude,
        Math.min(restrictToBounds.northEast.latitude, region.latitude)
      );

      // Clamp longitude
      clampedRegion.longitude = Math.max(
        restrictToBounds.southWest.longitude,
        Math.min(restrictToBounds.northEast.longitude, region.longitude)
      );

      // Also clamp zoom level so user can't zoom out beyond bounds box
      const maxLatDelta =
        restrictToBounds.northEast.latitude -
        restrictToBounds.southWest.latitude;
      const maxLngDelta =
        restrictToBounds.northEast.longitude -
        restrictToBounds.southWest.longitude;

      clampedRegion.latitudeDelta = Math.min(region.latitudeDelta, maxLatDelta);
      clampedRegion.longitudeDelta = Math.min(
        region.longitudeDelta,
        maxLngDelta
      );

      return clampedRegion;
    },
    [restrictToBounds]
  );

  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      const clampedRegion = clampRegionToBounds(newRegion);

      // Only update if region actually changed to prevent infinite loops
      const regionChanged =
        Math.abs(clampedRegion.latitude - mapRegion.latitude) > 0.0001 ||
        Math.abs(clampedRegion.longitude - mapRegion.longitude) > 0.0001 ||
        Math.abs(clampedRegion.latitudeDelta - mapRegion.latitudeDelta) >
          0.0001 ||
        Math.abs(clampedRegion.longitudeDelta - mapRegion.longitudeDelta) >
          0.0001;

      if (!regionChanged) return;

      // Clear any existing timeout
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }

      // If region was clamped, animate back to valid region
      if (
        clampedRegion.latitude !== newRegion.latitude ||
        clampedRegion.longitude !== newRegion.longitude
      ) {
        mapRef.current?.animateToRegion(clampedRegion, 500);
      }

      setMapRegion(clampedRegion);
      onRegionChange?.(clampedRegion);

      // Debounce the onRegionChangeComplete call
      regionChangeTimeoutRef.current = setTimeout(() => {
        onRegionChangeComplete?.(clampedRegion);
      }, 300);
    },
    [onRegionChange, onRegionChangeComplete, clampRegionToBounds, mapRegion]
  );

  const handleCalloutPress = useCallback(
    (marker: MapMarker<T>) => {
      onCalloutPress?.(marker);
    },
    [onCalloutPress]
  );

  const centerOnUserLocation = useCallback(() => {
    mapRef.current?.animateToRegion(mapRegion, 1000);
  }, [mapRegion]);

  const fitAllMarkers = useCallback(() => {
    if (markers.length > 0) {
      mapRef.current?.fitToCoordinates(
        markers.map(marker => marker.coordinate),
        { edgePadding: { top: 20, bottom: 20, left: 20, right: 20 } }
      );
    }
  }, [markers]);

  const renderDefaultMarker = useCallback(
    (marker: MapMarker<T>) => (
      <View className="items-center" style={{ overflow: 'visible' }}>
        <View
          className="bg-white rounded-full p-1 shadow-lg border-2"
          style={{
            borderColor: marker.color || '#19A28F',
            overflow: 'visible',
          }}
        >
          <Ionicons
            name={(marker.icon as any) || 'location'}
            size={
              marker.size === 'small' ? 14 : marker.size === 'large' ? 22 : 18
            }
            color={marker.color || '#19A28F'}
          />
        </View>
      </View>
    ),
    []
  );

  // Memoize markers to prevent unnecessary re-renders
  const renderedMarkers = useMemo(() => {
    return markers.map((marker, index) => (
      <Marker
        key={`${marker.id}-${index}`}
        coordinate={marker.coordinate}
        title={marker.title}
        description={marker.description}
        onPress={() => handleMarkerPress(marker)}
        onCalloutPress={() => handleCalloutPress(marker)}
      >
        {customMarkerRenderer
          ? customMarkerRenderer(marker)
          : renderDefaultMarker(marker)}
        {customCalloutRenderer && (
          <Callout
            style={{
              backgroundColor: 'transparent',
              borderWidth: 0,
              borderRadius: 0,
            }}
            tooltip={true}
          >
            {customCalloutRenderer(marker)}
          </Callout>
        )}
      </Marker>
    ));
  }, [
    markers,
    customMarkerRenderer,
    customCalloutRenderer,
    handleMarkerPress,
    handleCalloutPress,
    renderDefaultMarker,
  ]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Ionicons name="location" size={48} color="#19A28F" />
        <Text className="text-lg font-semibold text-gray-600 mt-4">
          Loading map...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text className="text-lg font-semibold text-gray-600 mt-4">
          Unable to load map
        </Text>
        <Text className="text-sm text-gray-500 mt-2 text-center px-4">
          {error}
        </Text>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            className="mt-6 px-6 py-3 bg-primary rounded-full"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        onRegionChangeComplete={handleRegionChange}
        minZoomLevel={minZoomLevel}
        maxZoomLevel={maxZoomLevel}
      >
        {renderedMarkers}
      </MapView>

      {/* Map Controls */}
      <View className="absolute bottom-4 right-4">
        <TouchableOpacity
          className="bg-white rounded-full p-3 shadow-lg mb-2"
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={20} color="#19a28f" />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-white rounded-full p-3 shadow-lg"
          onPress={fitAllMarkers}
        >
          <Ionicons name="expand" size={20} color="#19a28f" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const GenericMapView = React.memo(GenericMapViewComponent) as <T = any>(
  props: GenericMapProps<T>
) => React.ReactElement;
