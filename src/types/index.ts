// types/index.ts

/**
 * Represents user's macro targets.
 */
export interface MacroTargets {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

/**
 * User preferences including macro targets and additional details.
 */
export interface UserPreferences extends MacroTargets {
    location: string;
    latitude?: number;
    longitude?: number;
    age?: number;
    weight?: number;
    height?: number;
    gender?: 'Male' | 'Female';
    activityLevel?: 'Sedentary' | 'Moderate' | 'Active';
    goal?: 'Lose' | 'Maintain' | 'Gain';
    unitSystem?: 'Metric' | 'Imperial';
    has_macros?: boolean;
    dietary_preference: string;
    dietary_restrictions: string[];
}

/**
 * Represents a meal suggestion from a restaurant.
 */
export interface Meal {
    id: string;
    name: string;
    restaurant: {
        name: string;
        location: string;
    };
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    imageUrl?: string;
    description: string;
    price?: number;
    distance?: number; //
    date: string;
    mealType: string;
    photo_url?: string;
    logging_mode?: string;
    amount?: number;
    serving_unit?: string;
    read_only?: boolean;
    meal_time?: string;
    matchScore?: number;
    latitude?: number;
    longitude?: number;
    rating?: number;
    cuisineTypes?: string[];
}

/**
 * Represents a meal that has been logged by the user.
 */
export interface LoggedMeal {
    id: string;
    name: string;
    timestamp: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    mealType?: string;
    photo_url?: string;
    logging_mode?: string;
    amount?: number;
    serving_unit?: string;
    read_only?: boolean;
    meal_time?: string;
}

export enum LoggingMode {
    barcode = "barcode",
    manual = "manual",
    scan = "scan",
    ai_recipe = "ai_recipe",
    search = "search",
    meal_finder = "meal_finder"
}

/**
 * Request payload for meal suggestions.
 */
export interface SuggestMealsRequest extends UserPreferences {}

/**
 * Response from the meal suggestion API.
 */
export interface SuggestMealsResponse {
    meals: Meal[];
}

export interface Restaurant {
    name: string;
    location: string;
}