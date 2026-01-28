import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { IMAGE_CONSTANTS } from "../constants/imageConstants";
import { Pie, PolarChart } from "victory-native";
import FavoritesService from "../services/favoritesService";
import { mealService } from "../services/mealService";
import { userService } from "../services/userService";
import useStore from "../store/useStore";
import { LinearProgress } from "../components/LinearProgress";
import { useMixpanel } from "@macro-meals/mixpanel/src";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type RootStackParamList = {
  AIRecipeDetailsScreen: { recipe: any; defaultDate?: string };
  MainTabs: { screen?: string } | undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "AIRecipeDetailsScreen">;
type RouteProps = RouteProp<RootStackParamList, "AIRecipeDetailsScreen">;

interface MacroData {
  label: string;
  value: number;
  total: number;
  color: string;
}

const macroColors = {
  Carbs: "#FFD600",
  Fat: "#E573D7",
  Protein: "#6C5CE7",
} as const;

const AIRecipeDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  
  const { recipe, defaultDate } = route.params;
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [macroBreakdown, setMacroBreakdown] = useState<MacroData[]>([]);
  const [tooltipData, setTooltipData] = useState<{
    label: string;
    value: number;
    color: string;
  } | null>(null);
  const token = useStore((state) => state.token);
  const mixpanel = useMixpanel();

  // Animation values for pie chart
  const animatedValues = useRef({
    protein: new Animated.Value(0),
    carbs: new Animated.Value(0),
    fat: new Animated.Value(0),
  }).current;

  // Check if recipe is in favorites on component mount
  useEffect(() => {
    mixpanel?.track({
      name: "ai_recipe_detail_viewed",
      properties: {
        recipe_id: recipe.id,
        calories: recipe.calories,
        protein_g: recipe.protein,
        carbs_g: recipe.carbs,
        fats_g: recipe.fat,
      },
    });
    checkIfFavorite();
    fetchUserPreferences();
    animatePieChart();
  }, []);

  const animatePieChart = () => {
    const total = recipe.protein + recipe.carbs + recipe.fat;
    const proteinPercent = (recipe.protein / total) * 100;
    const carbsPercent = (recipe.carbs / total) * 100;
    const fatPercent = (recipe.fat / total) * 100;

    Animated.parallel([
      Animated.timing(animatedValues.protein, {
        toValue: proteinPercent,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.carbs, {
        toValue: carbsPercent,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.fat, {
        toValue: fatPercent,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const checkIfFavorite = async (): Promise<void> => {
    try {
      const isInFavorites = await FavoritesService.isFavorite(
        recipe.name,
        "Recipe"
      );
      setIsFavorite(isInFavorites);
    } catch (error) {
      console.error("Error checking favorites:", error);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const preferences = await userService.getPreferences();

      // Update macro breakdown with actual user targets
      const updatedMacroBreakdown: MacroData[] = [
        {
          label: "Carbs",
          value: recipe.carbs,
          total: preferences.carbs_target,
          color: macroColors.Carbs,
        },
        {
          label: "Fat",
          value: recipe.fat,
          total: preferences.fat_target,
          color: macroColors.Fat,
        },
        {
          label: "Protein",
          value: recipe.protein,
          total: preferences.protein_target,
          color: macroColors.Protein,
        },
      ];
      setMacroBreakdown(updatedMacroBreakdown);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      // Fallback to default values if preferences fetch fails
      const defaultMacroBreakdown: MacroData[] = [
        {
          label: "Carbs",
          value: recipe.carbs,
          total: 50,
          color: macroColors.Carbs,
        },
        { label: "Fat", value: recipe.fat, total: 30, color: macroColors.Fat },
        {
          label: "Protein",
          value: recipe.protein,
          total: 20,
          color: macroColors.Protein,
        },
      ];
      setMacroBreakdown(defaultMacroBreakdown);
    }
  };

  const toggleFavorite = async (): Promise<void> => {
    try {
      // Convert recipe to FavoriteMeal format
      const recipeObj = {
        name: recipe.name,
        macros: {
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
        },
        image: "",
        restaurant: {
          name: "Recipe",
          location: "",
        },
        amount: 1,
        serving_size: 1,
        serving_unit: "serving",
        no_of_servings: 1,
        meal_type: "other",
        meal_time: defaultDate || "",
        logging_mode: "recipe",
        favorite: isFavorite,
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(
        recipeObj
      );
      setIsFavorite(newFavoriteStatus);
      mixpanel?.track({
        name: "ai_recipe_favorited",
        properties: {
          recipe_id: recipe.id,
          favorite_state: newFavoriteStatus,
        },
      });

      if (newFavoriteStatus) {
        Alert.alert("Added to favorites");
      } else {
        Alert.alert("Removed from favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorites");
    }
  };

  const pieChartData = [
    { label: "Protein", value: recipe.protein, color: macroColors.Protein },
    { label: "Carbs", value: recipe.carbs, color: macroColors.Carbs },
    { label: "Fat", value: recipe.fat, color: macroColors.Fat },
  ];

  const handleAddToLog = async (): Promise<void> => {
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    setIsLogging(true);
    try {
      // Prepare the recipe data for logging
      const mealData = {
        name: recipe.name,
        calories: recipe.calories,
        carbs: recipe.carbs,
        fat: recipe.fat,
        protein: recipe.protein,
        description: recipe.description,
        meal_time: defaultDate,
        meal_type: "lunch", // Default to lunch, could be made configurable
      };
      mixpanel?.track({
        name: "add_to_log_from_ai_recipe_submitted",
        properties: {
          recipe_id: recipe.id,
          meal_type: mealData.meal_type,
          calories: recipe.calories,
          protein_g: recipe.protein,
          carbs_g: recipe.carbs,
          fats_g: recipe.fat,
          // serving_size_g: 1,
        },
      });
      console.log("Logging recipe:", mealData);

      // Use the mealService to log the meal
      const loggedMeal = await mealService.logMeal(mealData);

      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      console.log("Recipe logged successfully:", loggedMeal);

      Alert.alert("Success", "Recipe added to today's log!", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to main dashboard
            navigation.navigate("MainTabs", { screen: "Meals" });
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error logging recipe:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add recipe to log. Please try again."
      );
    } finally {
      setIsLogging(false);
    }
  };
  const handleBack = () => {
    mixpanel?.track({
      name: "ai_recipe_back_to_add_meal",
      properties: {
        gesture_type: "button",
      },
    });
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-[#f2f2f2]">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {/* Top Image */}
          <View style={{ height: SCREEN_HEIGHT * 0.4, width: "100%" }}>
            <Image
              source={IMAGE_CONSTANTS.logo}
              style={{ width: "100%", height: "100%", resizeMode: "cover" }}
            />
            {/* Back and Favorite buttons */}
            <View
              style={{
                position: "absolute",
                top: 50,
                left: 20,
                right: 20,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                onPress={handleBack}
                className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Text className="text-[22px]">‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleFavorite}
                className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Image
                  source={
                    isFavorite ? IMAGE_CONSTANTS.star : IMAGE_CONSTANTS.starIcon
                  }
                  className="h-[16px] w-[16px]"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-5">
            {/* Recipe Title and Description */}
            <View className="mt-5 mb-4 bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-xl font-bold text-[#222] mb-2">
                {recipe.name}
              </Text>
              <Text className="text-sm text-[#666]">{recipe.description}</Text>
            </View>

            {/* Macro Breakdown Card - Matching MealFinderBreakdown */}
            <View
              className="mt-4 mb-4 rounded-xl p-5 shadow-sm"
              style={{
                backgroundColor: "#fff",
              }}
            >
              <Text className="text-lg font-semibold mb-5">
                Macro breakdown
              </Text>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base text-[#222] font-medium">
                  Total calories
                </Text>
                <Text className="text-base text-[#222] font-semibold">
                  {recipe.calories} cal
                </Text>
              </View>
              {macroBreakdown.length > 0 ? (
                macroBreakdown.map((macro: MacroData) => (
                  <View key={macro.label} className="mb-5">
                    <View className="flex-row items-center mb-1 justify-between">
                      <Text className="text-sm font-semibold text-[#222]">
                        {macro.label}
                      </Text>
                      <Text className="text-sm text-[#222] font-semibold">
                        {macro.value}g
                      </Text>
                    </View>
                    <View className="flex-1">
                      <LinearProgress
                        progress={(macro.value / macro.total) * 100}
                        color={macro.color}
                        height={6}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#19a28f" />
                  <Text className="text-sm text-[#888] mt-2">
                    Loading macro breakdown...
                  </Text>
                </View>
              )}
            </View>

            {/* Ingredients Section - Updated Design */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-[#222] mb-3">
                INGREDIENTS
              </Text>
              {recipe.ingredients.map((ingredient: string, index: number) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                  <Text className="text-sm text-[#444] flex-1 leading-5">
                    {ingredient}
                  </Text>
                </View>
              ))}
            </View>

            {/* Instructions Section - Updated Design */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-[#222] mb-3">
                INSTRUCTIONS
              </Text>
              {recipe.recipe.map((step: string, index: number) => (
                <View key={index} className="flex-row items-start mb-4">
                  <View className="w-6 h-6 bg-primary rounded-full items-center justify-center mr-3 flex-shrink-0">
                    <Text className="text-white text-xs font-bold">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="text-sm text-[#444] flex-1 leading-5">
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {/* Nutrition Section with Pie Chart */}
            <View className="bg-white rounded-xl p-4 mb-8 shadow-sm">
              <Text className="text-lg font-bold text-[#222] mb-4">
                NUTRITION
              </Text>

              <View className="flex-row items-center mb-4">
                {/* Animated Pie Chart */}
                <View className="w-48 h-48 mr-2 relative">
                  <View className="w-full h-full border-gray-200 relative overflow-hidden">
                    {/* Animated slices */}
                    <PolarChart
                      data={pieChartData}
                      labelKey="label"
                      valueKey="value"
                      colorKey="color"
                    >
                      <Pie.Chart innerRadius={60} />
                    </PolarChart>
                  </View>

                  {/* Tooltip */}
                  {tooltipData && (
                    <View
                      className="absolute bg-black/90 rounded-lg px-4 py-3 shadow-lg"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: [{ translateX: -50 }, { translateY: -50 }],
                        zIndex: 1000,
                        elevation: 10,
                      }}
                    >
                      <Text className="text-white text-base font-bold text-center mb-1">
                        {tooltipData.label}
                      </Text>
                      <Text className="text-white text-sm text-center">
                        {tooltipData.value}g
                      </Text>
                    </View>
                  )}

                  {/* Touch overlay for dismissing tooltip */}
                  <TouchableWithoutFeedback
                    onPress={() => setTooltipData(null)}
                  >
                    <View className="absolute inset-0" />
                  </TouchableWithoutFeedback>
                </View>

                {/* Legend */}
                <View className="flex-1 ml-5">
                  <TouchableOpacity
                    className="flex-row items-center mb-2 p-1 rounded"
                    onPress={() =>
                      setTooltipData({
                        label: "Protein",
                        value: recipe.protein,
                        color: macroColors.Protein,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-3 h-3 rounded mr-1"
                      style={{ backgroundColor: macroColors.Protein }}
                    />
                    <Text className="text-sm font-medium text-[#222] mr-1">
                      Protein
                    </Text>
                    <Text className="text-sm font-bold text-[#222]">
                      {recipe.protein}g
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center mb-2 p-1 rounded"
                    onPress={() =>
                      setTooltipData({
                        label: "Carbs",
                        value: recipe.carbs,
                        color: macroColors.Carbs,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-3 h-3 rounded mr-1"
                      style={{ backgroundColor: macroColors.Carbs }}
                    />
                    <Text className="text-sm font-medium text-[#222] mr-1">
                      Carbs
                    </Text>
                    <Text className="text-sm font-bold text-[#222]">
                      {recipe.carbs}g
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-1 rounded"
                    onPress={() =>
                      setTooltipData({
                        label: "Fat",
                        value: recipe.fat,
                        color: macroColors.Fat,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-3 h-3 rounded mr-1"
                      style={{ backgroundColor: macroColors.Fat }}
                    />
                    <Text className="text-sm font-medium text-[#222] mr-1">
                      Fat
                    </Text>
                    <Text className="text-sm font-bold text-[#222]">
                      {recipe.fat}g
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress Bars */}
            </View>
          </View>
          <View className="h-16" />
        </ScrollView>

        {/* Fixed Button at Bottom - Matching MealFinderBreakdown */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-[20px] shadow-lg">
          <TouchableOpacity
            className="w-full h-[56px] rounded-full bg-primary items-center justify-center"
            onPress={handleAddToLog}
            disabled={isLogging}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                Add to today's log
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default AIRecipeDetailsScreen;
