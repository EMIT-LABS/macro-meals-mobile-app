// Type definitions (should match MapProvider)
interface Restaurant {
  id: string;
  name: string;
  rating: number;
  priceLevel: number;
  vicinity: string;
  location: {
    latitude: number;
    longitude: number;
  };
  photos: string[];
  isOpen: boolean;
  types: string[];
}

interface RestaurantDetails {
  id: string;
  name: string;
  rating: number;
  priceLevel: number;
  formattedAddress: string;
  formattedPhoneNumber?: string;
  website?: string;
  openingHours?: {
    openNow: boolean;
    weekdayText: string[];
  };
  photos: string[];
  reviews: Array<{
    authorName: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

interface RestaurantSearchCriteria {
  radius?: number; // in meters
  type?: string; // 'restaurant', 'food', etc.
  priceLevel?: number; // 0-4
  rating?: number; // minimum rating
  openNow?: boolean;
  keyword?: string; // specific cuisine or food type
}

export interface AutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// services/restaurantService.ts
export class RestaurantService {
    private apiKey: string;
    private baseUrl = 'https://maps.googleapis.com/maps/api/place';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async searchNearbyRestaurants(
        location: { latitude: number; longitude: number },
        criteria: RestaurantSearchCriteria
    ): Promise<Restaurant[]> {
        const queryParams: Record<string, string> = {
            location: `${location.latitude},${location.longitude}`,
            radius: criteria.radius?.toString() || '5000',
            type: criteria.type || 'restaurant',
            key: this.apiKey,
        };

        if (criteria.priceLevel !== undefined) {
            queryParams.maxprice = criteria.priceLevel.toString();
        }
        if (criteria.keyword) {
            queryParams.keyword = criteria.keyword;
        }
        if (criteria.openNow) {
            queryParams.opennow = 'true';
        }

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        try {
            const response = await fetch(
                `${this.baseUrl}/nearbysearch/json?${queryString}`
            );
            const data = await response.json();
            
            if (data.status !== 'OK') {
                throw new Error(`Google Places API error: ${data.status}`);
            }
            
            return data.results.map((place: any) => this.transformPlaceToRestaurant(place));
        } catch (error) {
            console.error('Error searching nearby restaurants:', error);
            throw error;
        }
    }

    async searchRestaurantsByText(query: string): Promise<Restaurant[]> {
        const queryParams: Record<string, string> = {
            query: query,
            type: 'restaurant',
            key: this.apiKey,
        };

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        try {
            const response = await fetch(
                `${this.baseUrl}/textsearch/json?${queryString}`
            );
            const data = await response.json();
            
            if (data.status !== 'OK') {
                throw new Error(`Google Places API error: ${data.status}`);
            }
            
            return data.results.map((place: any) => this.transformPlaceToRestaurant(place));
        } catch (error) {
            console.error('Error searching restaurants by text:', error);
            throw error;
        }
    }

    async getAutocompletePredictions(
        input: string,
        types: string = 'establishment|geocode'
    ): Promise<AutocompletePrediction[]> {
        if (!input || input.trim().length < 2) {
            return [];
        }

        const queryParams: Record<string, string> = {
            input: input,
            types: types,
            key: this.apiKey,
        };

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        try {
            const response = await fetch(
                `${this.baseUrl}/autocomplete/json?${queryString}`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.predictions) {
                return data.predictions.map((prediction: any) => ({
                    description: prediction.description,
                    place_id: prediction.place_id,
                    structured_formatting: {
                        main_text: prediction.structured_formatting?.main_text || prediction.description,
                        secondary_text: prediction.structured_formatting?.secondary_text || '',
                    },
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Error getting autocomplete predictions:', error);
            throw error;
        }
    }

    /**
     * Get coordinates for a place (e.g. for map/search).
     */
    async getPlaceCoordinates(placeId: string): Promise<{ latitude: number; longitude: number } | null> {
        const queryParams: Record<string, string> = {
            place_id: placeId,
            fields: 'geometry',
            key: this.apiKey,
        };
        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        try {
            const response = await fetch(
                `${this.baseUrl}/details/json?${queryString}`
            );
            const data = await response.json();
            if (data.status !== 'OK' || !data.result?.geometry?.location) {
                return null;
            }
            const loc = data.result.geometry.location;
            return { latitude: loc.lat, longitude: loc.lng };
        } catch (error) {
            console.error('Error getting place coordinates:', error);
            return null;
        }
    }

    async getRestaurantDetails(placeId: string): Promise<RestaurantDetails | null> {
        const queryParams: Record<string, string> = {
            place_id: placeId,
            fields: 'name,rating,formatted_phone_number,formatted_address,opening_hours,photos,reviews,price_level,website',
            key: this.apiKey,
        };

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        try {
            const response = await fetch(
                `${this.baseUrl}/details/json?${queryString}`
            );
            const data = await response.json();
            
            if (data.status !== 'OK') {
                throw new Error(`Google Places API error: ${data.status}`);
            }
            
            return data.result ? this.transformPlaceDetails(data.result) : null;
        } catch (error) {
            console.error('Error getting restaurant details:', error);
            return null;
        }
    }

    private transformPlaceToRestaurant(place: any): Restaurant {
        return {
            id: place.place_id,
            name: place.name,
            rating: place.rating || 0,
            priceLevel: place.price_level || 0,
            vicinity: place.vicinity,
            location: {
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
            },
            photos: place.photos?.map((photo: any) => 
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
            ) || [],
            isOpen: place.opening_hours?.open_now || false,
            types: place.types || [],
        };
    }

    private transformPlaceDetails(place: any): RestaurantDetails {
        return {
            id: place.place_id,
            name: place.name,
            rating: place.rating || 0,
            priceLevel: place.price_level || 0,
            formattedAddress: place.formatted_address,
            formattedPhoneNumber: place.formatted_phone_number,
            website: place.website,
            openingHours: place.opening_hours ? {
                openNow: place.opening_hours.open_now,
                weekdayText: place.opening_hours.weekday_text || [],
            } : undefined,
            photos: place.photos?.map((photo: any) => 
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
            ) || [],
            reviews: place.reviews?.map((review: any) => ({
                authorName: review.author_name,
                rating: review.rating,
                text: review.text,
                time: review.time,
            })) || [],
        };
    }
}