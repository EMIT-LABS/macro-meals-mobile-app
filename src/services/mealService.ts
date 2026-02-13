import useStore from 'src/store/useStore';
import { LoggedMeal, Meal } from '../types';
import axiosInstance from './axios';
import { userService } from './userService';

/**
 * API configuration.
 */

/**
 * Interface for meal data to be logged
 */
interface LogMealRequest {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  meal_type?: string;
  meal_time?: string;
  description?: string;
  serving_size?: string;
  serving_unit?: string;
  number_of_servings?: string;
  photo?: {
    uri: string;
    type?: string;
    name?: string;
  };
}

/**
 * Interface for daily progress response
 */
interface DailyProgressResponse {
  logged_macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  target_macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  progress_percentage: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}
/**
 * Interface for AI meal suggestions request
 */
interface AiMealSuggestionsRequest {
  calories: number;
  carbs: number;
  fat: number;
  latitude: number;
  location: string;
  longitude: number;
  protein: number;
}

export enum MealFeedback {
  ThumbUp = 'thumbs_up',
  ThumbDown = 'thumbs_down',
}

interface FeedbackRequest {
  feedback: MealFeedback;
  mealImage: string;
  barcode: string;
}

interface RestaurantRequest {
  restaurant_name: string;
  location: string;
  reason: string;
}

/**
 * Service for meal-related API operations.
 */
export const mealService = {
  /**
   * Fetches AI meal suggestions based on user preferences and macro targets
   * @param requestBody - The request body with macro targets and location
   * @returns Promise with suggested meals
   * @throws Error if the request fails or times out
   */
  suggestAiMeals: async (
    requestBody: AiMealSuggestionsRequest
  ): Promise<Meal[]> => {
    const token = useStore.getState().token;

    if (!token) {
      throw new Error('Authentication required');
    }

    // Create an AbortController for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000); // 1 minute timeout

    try {
      const response = await axiosInstance.post(
        '/meals/suggest-meals',
        requestBody,
        {
          signal: controller.signal,
        }
      );

      return response.data.meals || [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 1 minute. Please try again.');
      } else {
        throw new Error(err.message || 'Error fetching AI meal suggestions');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Fetches AI meal suggestions with automatic preference fetching
   * @returns Promise with suggested meals
   * @throws Error if the request fails
   */
  getAiMealSuggestions: async (): Promise<{
    meals: Meal[];
    preferences: any;
  }> => {
    try {
      // First fetch preferences from userService
      const preferences = await userService.getPreferences();

      // Create request body with preferences data
      const requestBody: AiMealSuggestionsRequest = {
        calories: preferences.calorie_target,
        carbs: preferences.carbs_target,
        fat: preferences.fat_target,
        protein: preferences.protein_target,
        latitude: 0,
        location: '',
        longitude: 0,
      };

      console.log('requestBody', JSON.stringify(requestBody, null, 2));

      // Fetch AI meal suggestions
      const meals = await mealService.suggestAiMeals(requestBody);

      return { meals, preferences };
    } catch (error) {
      console.error('Error getting AI meal suggestions:', error);
      throw error;
    }
  },

  getAiMealSuggestionsRecipes: async (): Promise<{
    suggestions: any[];
    preferences: any;
  }> => {
    try {
      // First fetch preferences from userService
      const preferences = await userService.getPreferences();

      // Create request body with preferences data
      const requestBody: AiMealSuggestionsRequest = {
        calories: preferences.calorie_target,
        carbs: preferences.carbs_target,
        fat: preferences.fat_target,
        protein: preferences.protein_target,
        latitude: 0,
        location: '',
        longitude: 0,
      };

      console.log('requestBody', JSON.stringify(requestBody, null, 2));

      // Fetch AI meal suggestions
      const response = await axiosInstance.post(
        '/meals/suggest-recipes',
        requestBody
      );

      return { suggestions: response.data.suggestions, preferences };
    } catch (error) {
      console.error('Error getting AI meal suggestions:', error);
      throw error;
    }
  },

  /**
   * Fetches meal suggestions based on user macroAndLocation.
   *
   * @param macroAndLocation - User macro targets and location
   * @returns Promise with suggested meals
   */
  suggestMeals: async (macroAndLocation: any): Promise<Meal[]> => {
    try {
      const response = await axiosInstance.post(
        '/meals/suggest-meals',
        macroAndLocation
      );
      return response.data.meals;
    } catch (error) {
      console.error('Error suggesting meals:', error);
      throw error;
    }
  },

  /**
   * Log a meal to the backend
   * @param mealData - The meal data to log
   * @returns The logged meal data with ID
   * @throws Error if the request fails
   */
  logMeal: async (mealData: LogMealRequest): Promise<LoggedMeal> => {
    const token = useStore.getState().token;
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const formData = new FormData();

      // Handle photo separately to avoid stringification
      const { photo, ...mealDataWithoutPhoto } = mealData;

      // Add all meal data to FormData
      Object.entries(mealDataWithoutPhoto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add photo to FormData if it exists
      if (photo?.uri) {
        // Get the file extension from the URI
        const uriParts = photo.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('photo', {
          uri: photo.uri,
          type: `image/${fileType}`,
          name: `photo.${fileType}`,
        } as any);
      }

      const response = await axiosInstance.post('/meals/add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  },

  updateMeal: async (
    mealData: LogMealRequest,
    mealId: string
  ): Promise<LoggedMeal> => {
    const token = useStore.getState().token;
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const formData = new FormData();

      // Handle photo separately to avoid stringification
      const { photo, ...mealDataWithoutPhoto } = mealData;

      // Add all meal data to FormData
      Object.entries(mealDataWithoutPhoto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add photo to FormData if it exists - using same format as logMeal
      if (photo && photo.uri) {
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: 'meal_photo.jpg',
        } as any);
      }

      const response = await axiosInstance.put(`/meals/${mealId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  },

  /**
   * Log meal feedback
   * @param mealId - The ID of the meal to log feedback for
   * @param feedback - The feedback to log
   * @returns Promise with the logged feedback
   * @throws Error if the request fails
   */
  mealFeedback: async (
    mealImage: string,
    mealName: string,
    feedbackRequest: FeedbackRequest
  ): Promise<void> => {
    try {
      const payload = {
        feedback: feedbackRequest.feedback,
        meal_image: mealImage,
        meal_name: mealName,
      };
      console.log('Meal feedback request payload:', JSON.stringify(payload));
      const response = await axiosInstance.post(`/meals/feedback`, payload);
      return response.data;
    } catch (error) {
      console.error('Error logging meal feedback:', error);
      throw error;
    }
  },

  productFeedback: async (
    feedbackRequest: FeedbackRequest,
    productName: string
  ): Promise<void> => {
    try {
      const payload = {
        feedback: feedbackRequest.feedback,
        barcode: feedbackRequest.barcode,
        product_name: productName,
      };
      console.log('THE payload:', JSON.stringify(payload));
      const response = await axiosInstance.post(`/products/feedback`, payload);
      return response.data;
    } catch (error) {
      console.error('Error logging product feedback:', error);
      throw error;
    }
  },

  /**
   * Get today's logged meals
   * @returns Array of logged meals for today
   * @throws Error if the request fails
   */
  getLoggedMeals: async (): Promise<LoggedMeal[]> => {
    const token = useStore.getState().token;

    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await axiosInstance.get('/meals/today');

      const meals = response.data;
      return meals.map((meal: any) => ({
        id: meal.id,
        name: meal.name,
        timestamp: meal.meal_time,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        calories: meal.calories,
        mealType: meal.meal_type,
        photo_url: meal.photo_url,
        logging_mode: meal.logging_mode,
        amount: meal.amount,
        serving_unit: meal.serving_unit,
        read_only: meal.read_only,
        meal_time: meal.meal_time,
      }));
    } catch (error) {
      console.error("Error fetching today's meals:", error);
      throw error;
    }
  },

  /**
   * Search for meals by name
   * @param query - The query to search for
   * @returns Promise with suggested meals
   * @throws Error if the request fails
   */
  searchMeal: async (query: string): Promise<Meal[]> => {
    const url = `/meals/search?query=${encodeURIComponent(query)}`;
    // const url = `/meals/search?query=Fufu`;

    console.log('🔍 Search URL:', url);

    try {
      const response = await axiosInstance.get(url);
      console.log('🔍 Parsed response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error searching meals:', error);
      throw error;
    }
  },

  /**
   * Search for meals by name
   * @param query - The query to search for
   * @returns Promise with suggested meals
   * @throws Error if the request fails
   */
  searchMealsApi: async (query: string): Promise<any> => {
    const url = `/products/search-meals-format?query=${encodeURIComponent(query)}`;
    console.log('🔍 Global search service - URL:', url);

    try {
      const response = await axiosInstance.get(url);
      console.log('🔍 Global search service - Parsed data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error searching meals API:', error);
      throw error;
    }
  },

  /**
   * Get daily macro progress
   * @returns Daily progress with consumed and target macros
   * @throws Error if the request fails
   */
  getDailyProgress: async (): Promise<DailyProgressResponse> => {
    const token = useStore.getState().token;

    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await axiosInstance.get('/meals/progress/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching daily progress:', error);
      throw error;
    }
  },

  /**
   * Delete a logged meal
   * @param mealId - The ID of the meal to delete
   * @throws Error if the request fails
   */
  deleteMeal: async (mealId: string): Promise<void> => {
    const token = useStore.getState().token;

    if (!token) {
      throw new Error('Authentication required');
    }
    console.log('Deleting meal:', mealId);

    try {
      await axiosInstance.delete(`/meals/${mealId}`);
    } catch (error) {
      console.error('Error deleting meal:', error);
      throw error;
    }
  },

  /**
   * Fetches map pins for restaurants with meals
   * @param latitude - The latitude coordinate
   * @param longitude - The longitude coordinate
   * @param query - Optional search query term
   * @param cuisines - Optional array of cuisine types to filter by
   * @param matchingMode - Optional matching mode ('restaurant' or 'meal')
   * @returns Promise with map pins data
   * @throws Error if the request fails
   */
  getMapPins: async (
    latitude: number,
    longitude: number,
    query?: string,
    cuisines?: string[],
    matchingMode?: 'restaurant' | 'meal'
  ): Promise<any> => {
    const token = useStore.getState().token;

    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      let url = `/meals/map-pins?latitude=${latitude}&longitude=${longitude}`;
      if (query && query.trim().length > 0) {
        url += `&query=${encodeURIComponent(query.trim())}`;
      }
      if (cuisines && cuisines.length > 0) {
        url += `&cuisine_types=${encodeURIComponent(cuisines.join(','))}`;
      }
      if (matchingMode) {
        url += `&matching_mode=${encodeURIComponent(matchingMode)}`;
      }
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching map pins:', error);
      throw error;
    }
  },
  requestRestaurant: async (
    restaurantData: RestaurantRequest
  ): Promise<any> => {
    try {
      const token = useStore.getState().token;
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await axiosInstance.post(
        '/contact/restaurant-request',
        restaurantData
      );
      return response.data;
    } catch (error) {
      console.error('Error requesting restaurant:', error);
      throw error;
    }
  },
};

export async function getMealProgress(startDate: string, endDate: string) {
  const url = `/meals/progress?start_date=${startDate}&end_date=${endDate}`;
  console.log('getMealProgress URL:', url);

  try {
    const response = await axiosInstance.get(url);
    console.log('Get Meal Progress Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getMealProgress error:', error);
    throw error;
  }
}

export async function getMealByPeriod(period: string) {
  const url = `/meals/progress?period=${period}`;
  console.log('getMealByPeriod URL:', url);

  try {
    const response = await axiosInstance.get(url);
    console.log('Get Meal By Period Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getMealByPeriod error:', error);
    throw error;
  }
}

export async function getMeals(
  startDate: string,
  endDate: string,
  page: number = 0
) {
  // Only include page parameter if it's greater than 0, as some APIs don't like page=0
  const pageParam = page > 0 ? `&page=${page}` : '';
  const url = `/meals/logs?start_date=${startDate}&end_date=${endDate}${pageParam}`;
  console.log('getMeals URL:', url);
  console.log('getMeals parameters:', { startDate, endDate, page });

  try {
    const response = await axiosInstance.get(url);
    console.log('Get Meals Response:', response.data);
    console.log('Response meals count:', response.data.results?.length || 0);
    return {
      meals: response.data.results || [],
      pagination: response.data.pagination || {
        has_next: false,
        has_previous: false,
        page: 0,
        page_size: 0,
        total: 0,
        total_pages: 0,
      },
    };
  } catch (error: any) {
    console.error('getMeals error:', error);
    console.error('Error response data:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
}
