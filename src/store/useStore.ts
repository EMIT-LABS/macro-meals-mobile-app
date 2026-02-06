// store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meal, UserPreferences, LoggedMeal } from '../types';
import { authService } from '../services/authService';
import { mealService } from '../services/mealService';
import { authTokenService } from '../services/authTokenService';

/**
 * Default user preferences with all values set to 0.
 */
const DEFAULT_USER_PREFERENCES: UserPreferences = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    location: '',
    age: 0,
    weight: 0,
    height: 0,
    gender: undefined,
    activityLevel: undefined,
    goal: undefined,
    unitSystem: 'Metric',
    has_macros: false,
    dietary_preference: '',
    dietary_restrictions: [],
};

// Referral object from /user/me (promo-style code with limited redemptions and expiry)
export interface ReferralRedemption {
    user_id: string;
    date_redeemed: string;
    trial_end_date: string;
}

export interface ReferralObject {
    id: string;
    referral_code: string;
    max_redemptions: number;
    redemptions_used: number;
    expiry_date: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    redemption?: ReferralRedemption;
}

// Add Profile interface
export interface Profile {
    id?: string;
    display_name?: string;
    email?: string;
    avatar_url?: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    is_active?: boolean;
    is_pro?: boolean;
    meal_reminder_preferences_set?: boolean;
    has_macros?: boolean;
    has_used_trial?: boolean;
    referral?: ReferralObject | null;
}

/**
 * User should skip paywall only when both is_pro and active referral are true.
 */
export function shouldSkipPaywall(profile: Profile | null | undefined): boolean {
    if (!profile) return false;
    return profile.is_pro === true && (profile.referral?.is_active === true);
}

type MacrosPreferences = {
    protein_target: number;
    carbs_target: number;
    fat_target: number;
    calorie_target: number;
};

type TodayProgress = {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
};

type TodayMealsSum = {
    protein: number;
    carbs: number;
    fat: number;
};

/**
 * Interface for the application state store.
 */
interface AppState {
    // Authentication state
    isAuthenticated: boolean;
    token: string | null;
    userId: string | null;

    // Authentication methods
    setAuthenticated: (authenticated: boolean, token: string, userId: string) => void;
    checkAuth: () => Promise<boolean>;
    logout: () => void;

    // Profile state
    profile: Profile | null;
    setProfile: (profile: Profile) => void;
    updateProfile: (updates: Partial<Profile>) => void;
    clearProfile: () => void;

    // Goal setup state
    hasBeenPromptedForGoals: boolean;
    setHasBeenPromptedForGoals: (prompted: boolean) => void;

    // Has logged first meal state (per user)
    userFirstMealStatus: { [email: string]: boolean };
    setUserFirstMealStatus: (email: string, hasLogged: boolean) => void;
    hasLoggedFirstMeal: (email: string) => boolean;

    // User preferences state
    preferences: UserPreferences;
    updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
    resetPreferences: () => void;

    // Meal suggestions state
    suggestedMeals: Meal[];
    isLoadingSuggestions: boolean;
    suggestionsError: string | null;
    setSuggestedMeals: (meals: Meal[]) => void;
    setIsLoadingSuggestions: (isLoading: boolean) => void;
    setSuggestionsError: (error: string | null) => void;

    // Logged meals state and actions
    loggedMeals: Meal[];
    addLoggedMeal: (meal: Meal) => void;
    deleteLoggedMeal: (mealId: string) => void;
    setLoggedMeals: (meals: Meal[]) => void;
    refreshMeals: () => Promise<void>;
    shouldRefreshMeals: boolean;
    setShouldRefreshMeals: (shouldRefresh: boolean) => void;

    // Macros preferences state and actions
    macrosPreferences: MacrosPreferences;
    setMacrosPreferences: (preferences: MacrosPreferences) => void;

    // Today's progress state and actions
    todayProgress: TodayProgress;
    setTodayProgress: (progress: TodayProgress) => void;
    fetchTodayProgress: () => Promise<void>;

    // Today's meals sum
    todayMealsSum: TodayMealsSum;
    setTodayMealsSum: (sum: TodayMealsSum) => void;
    calculateTodayMealsSum: () => void;
}

/**
 * Convert API LoggedMeal format to app Meal format with null checking
 */
const convertToMeal = (loggedMeal: LoggedMeal): Meal | null => {
    if (!loggedMeal) return null;

    return {
        id: loggedMeal.id || String(Math.random()),
        name: loggedMeal.name || 'Unnamed Meal',
        restaurant: {
            name: 'Home',  // Default value if not provided by API
            location: '',
        },
        macros: {
            calories: loggedMeal.calories || 0,
            protein: loggedMeal.protein || 0,
            carbs: loggedMeal.carbs || 0,
            fat: loggedMeal.fat || 0,
        },
        description: '',  // Default value if not provided by API
        date: loggedMeal.timestamp || new Date().toISOString(),
        mealType: loggedMeal.mealType || 'lunch',  // Default value if not provided by API
        photo_url: loggedMeal.photo_url, // Include photo_url from API
        logging_mode: loggedMeal.logging_mode,
        amount: loggedMeal.amount,
        serving_unit: loggedMeal.serving_unit,
        read_only: loggedMeal.read_only,
        meal_time: loggedMeal.meal_time,
    };
};

/**
 * Zustand store hook for global application state.
 */
const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Authentication state
            isAuthenticated: false,
            token: null,
            userId: null,

            setAuthenticated: (authenticated, token, userId) => {
                console.log('Setting authenticated:', {
                    authenticated,
                    userId
                });
                authTokenService.setToken(token);
                set({
                    isAuthenticated: authenticated,
                    token,
                    userId
                });
            },

            checkAuth: async () => {
                try {
                    const token = await authTokenService.initialize();
                    const userId = await AsyncStorage.getItem('userId');

                    if (token && userId) {
                        set({
                            isAuthenticated: true,
                            token,
                            userId
                        });
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Error checking auth:', error);
                    return false;
                }
            },

            // Initialize loggedMeals as an empty array
            loggedMeals: [],

            addLoggedMeal: (meal) => {
                if (!meal) return;
                set((state) => ({
                    loggedMeals: [...(state.loggedMeals || []), meal]
                }));
            },

            deleteLoggedMeal: (mealId) => {
                set((state) => ({
                    loggedMeals: state.loggedMeals.filter(meal => meal.id !== mealId)
                }));
            },

            setLoggedMeals: (meals) => set({ loggedMeals: meals || [] }),

            shouldRefreshMeals: false,

            setShouldRefreshMeals: (shouldRefresh) => set({ shouldRefreshMeals: shouldRefresh }),

            refreshMeals: async () => {
                try {
                    if (!mealService || !mealService.getLoggedMeals) {
                        console.error('Meal service not available');
                        return;
                    }

                    const todaysMeals = await mealService.getLoggedMeals();

                    if (!todaysMeals) {
                        console.error('No meals returned from API');
                        set({ loggedMeals: [], shouldRefreshMeals: false });
                        return;
                    }

                    // Convert API format to app format with null checking
                    const meals = todaysMeals
                        .filter((meal: LoggedMeal) => meal) // Remove null items
                        .map(convertToMeal)
                        .filter((meal): meal is Meal => meal !== null); // Remove nulls after conversion with type guard

                    set({
                        loggedMeals: meals || [],
                        shouldRefreshMeals: false
                    });
                } catch (error) {
                    console.error('Failed to refresh meals:', error);
                    // Set empty array on error to avoid undefined
                    set({ loggedMeals: [], shouldRefreshMeals: false });
                }
            },

            logout: async () => {
                try {
                    await authService.logout();
                    
                    // Clear RevenueCat user ID
                    try {
                        await import('../services/revenueCatService').then(({ default: revenueCatService }) => {
                            return revenueCatService.logout();
                        });
                        console.log('✅ RevenueCat user logged out');
                    } catch (error) {
                        console.error('❌ Failed to logout RevenueCat user:', error);
                    }
                } catch (error) {
                    console.error('Error during logout:', error);
                } finally {
                    set({
                        isAuthenticated: false,
                        token: null,
                        userId: null,
                        preferences: DEFAULT_USER_PREFERENCES,
                        suggestedMeals: [],
                        suggestionsError: null,
                        loggedMeals: [], // Clear logged meals on logout
                        shouldRefreshMeals: false,
                        profile: null,
                        hasBeenPromptedForGoals: false,
                        userFirstMealStatus: {}, // Clear first meal status on logout
                        macrosPreferences: {
                            protein_target: 0,
                            carbs_target: 0,
                            fat_target: 0,
                            calorie_target: 0,
                        },
                        todayProgress: {
                            protein: 0,
                            carbs: 0,
                            fat: 0,
                            calories: 0,
                        },
                        todayMealsSum: {
                            protein: 0,
                            carbs: 0,
                            fat: 0,
                        },
                    });

                    // Clear stored authentication data
                    await AsyncStorage.removeItem('my_token');
                    await AsyncStorage.removeItem('refresh_token');
                    await AsyncStorage.removeItem('user_id');
                }
            },

            // User preferences
            preferences: DEFAULT_USER_PREFERENCES,

            updatePreferences: (newPreferences) =>
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        ...newPreferences,
                    },
                })),

            resetPreferences: () =>
                set(() => ({
                    preferences: DEFAULT_USER_PREFERENCES,
                })),

            // Meal suggestions
            suggestedMeals: [],
            isLoadingSuggestions: false,
            suggestionsError: null,

            setSuggestedMeals: (meals) =>
                set(() => ({
                    suggestedMeals: meals,
                })),

            setIsLoadingSuggestions: (isLoading) =>
                set(() => ({
                    isLoadingSuggestions: isLoading,
                })),

            setSuggestionsError: (error) =>
                set(() => ({
                    suggestionsError: error,
                })),

            // Profile state
            profile: null,
            setProfile: (profile) => set({ profile }),
            updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
            clearProfile: () => set({ profile: null }),

            // Goal setup state
            hasBeenPromptedForGoals: false,
            setHasBeenPromptedForGoals: (prompted) => set({ hasBeenPromptedForGoals: prompted }),

            // Has logged first meal (per user)
            userFirstMealStatus: {},
            setUserFirstMealStatus: (email: string, hasLogged: boolean) => 
                set((state) => ({
                    userFirstMealStatus: {
                        ...state.userFirstMealStatus,
                        [email]: hasLogged
                    }
                })),
            hasLoggedFirstMeal: (email: string) => {
                const state = get();
                return state.userFirstMealStatus[email] || false;
            },

            // Macros preferences
            macrosPreferences: {
                protein_target: 0,
                carbs_target: 0,
                fat_target: 0,
                calorie_target: 0,
            },
            setMacrosPreferences: (preferences) => set({ macrosPreferences: preferences }),

            // Today's progress
            todayProgress: {
                protein: 0,
                carbs: 0,
                fat: 0,
                calories: 0,
            },
            setTodayProgress: (progress) => set({ todayProgress: progress }),
            fetchTodayProgress: async () => {
                try {
                    const progressData = await mealService.getDailyProgress();
                    set({
                        todayProgress: {
                            protein: progressData.logged_macros.protein || 0,
                            carbs: progressData.logged_macros.carbs || 0,
                            fat: progressData.logged_macros.fat || 0,
                            calories: progressData.logged_macros.calories || 0,
                        }
                    });
                } catch (error) {
                    console.error('Error fetching today\'s progress:', error);
                }
            },

            // Today's meals sum
            todayMealsSum: {
                protein: 0,
                carbs: 0,
                fat: 0,
            },
            setTodayMealsSum: (sum) => set({ todayMealsSum: sum }),
            calculateTodayMealsSum: () => {
                const state = get();
                const sum = state.loggedMeals.reduce(
                    (acc, meal) => ({
                        carbs: acc.carbs + (meal.macros?.carbs || 0),
                        fat: acc.fat + (meal.macros?.fat || 0),
                        protein: acc.protein + (meal.macros?.protein || 0),
                    }),
                    { carbs: 0, fat: 0, protein: 0 }
                );
                set({ todayMealsSum: sum });
            },
        }),
        {
            name: 'macromate-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                token: state.token,
                userId: state.userId,
                preferences: state.preferences,
                suggestedMeals: state.suggestedMeals,
                suggestionsError: state.suggestionsError,
                loggedMeals: state.loggedMeals,
                profile: state.profile,
                hasBeenPromptedForGoals: state.hasBeenPromptedForGoals,
                userFirstMealStatus: state.userFirstMealStatus,
                macrosPreferences: state.macrosPreferences,
                todayProgress: state.todayProgress,
                todayMealsSum: state.todayMealsSum,
            }),
        }
    )
);

export default useStore;