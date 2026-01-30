import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { IMAGE_CONSTANTS } from "../constants/imageConstants";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
import useStore from "../store/useStore";
import { CircularProgress } from "src/components/CircularProgress";
import { mealService } from "../services/mealService";
import { useMixpanel } from "@macro-meals/mixpanel";
import { usePosthog } from "@macro-meals/posthog_service/src";

type RootStackParamList = {
  AddMeal: { analyzedData?: any };
  AIRecipeDetailsScreen: { recipe: any };
};

type NavigationProp = StackNavigationProp<RootStackParamList, "AddMeal">;

interface MacroData {
  label: "Protein" | "Carbs" | "Fat";
  value: number;
  color: string;
}

interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  recipe: string[];
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

const macroTypeToPreferenceKey = {
  Protein: "protein_target",
  Carbs: "carbs_target",
  Fat: "fat_target",
} as const;

const defaultMacroData: MacroData[] = [
  { label: "Protein", value: 0, color: "#6C5CE7" },
  { label: "Carbs", value: 0, color: "#FFC107" },
  { label: "Fat", value: 0, color: "#FF69B4" },
];

const AiMealSuggestionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const macrosPreferences = useStore((state) => state.macrosPreferences);
  const todayProgress = useStore((state) => state.todayProgress) || {
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0,
  };
  const [macroData, setMacroData] = useState<MacroData[]>(defaultMacroData);
  const mixpanel = useMixpanel();
  const posthog = usePosthog()

  // const trackAIRecipeViewed = async () => {
  //   if (!mixpanel) return;

  //   const signupTime = mixpanel.getSuperProperty("signup_time");
  //   const properties: Record<string, any> = {};

  //   const firstAIRecipeViewed = mixpanel.getSuperProperty(
  //     "first_ai_recipe_viewed"
  //   );
  //   if (!firstAIRecipeViewed) {
  //     const now = new Date();
  //     const timeToFirstRecipe = signupTime
  //       ? (now.getTime() - new Date(signupTime).getTime()) / 1000
  //       : 0;
  //     properties.time_to_first_ai_recipe_seconds = timeToFirstRecipe;
  //     mixpanel.register({ first_ai_recipe_viewed: true });
  //   }

  //   mixpanel.track({
  //     name: "ai_recipe_viewed",
  //     properties,
  //   });
  //  posthog.track({
  //     name: "ai_recipe_viewed",
  //     properties,
  //   });
  // };

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await mealService.getAiMealSuggestionsRecipes();
      setRecipes(result.suggestions);

      // Track AI recipe suggestions viewed
      if (result.suggestions && result.suggestions.length > 0) {
        // await trackAIRecipeViewed();
      }
    } catch {
      setError("Failed to fetch recipe suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchRecipes();
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    mixpanel?.track({
      name: "ai_recipe_selected",
      properties: {
        recipe_id: recipe.name,
      },
    });
       posthog?.track({
      name: "ai_recipe_selected",
      properties: {
        recipe_id: recipe.name,
      },
    });
    navigation.navigate("AIRecipeDetailsScreen", { recipe });
  };

  // Update macroData when todayProgress changes
  useEffect(() => {
    if (todayProgress) {
      setMacroData([
        {
          label: "Protein",
          value: todayProgress.protein || 0,
          color: "#6C5CE7",
        },
        { label: "Carbs", value: todayProgress.carbs || 0, color: "#FFC107" },
        { label: "Fat", value: todayProgress.fat || 0, color: "#FF69B4" },
      ]);
    }
  }, [todayProgress]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    // Fetch latest daily macro progress from API on mount
    const fetchProgress = async () => {
      try {
        const progressData = await mealService.getDailyProgress();
        setMacroData([
          {
            label: "Protein",
            value: progressData.logged_macros.protein || 0,
            color: "#6C5CE7",
          },
          {
            label: "Carbs",
            value: progressData.logged_macros.carbs || 0,
            color: "#FFC107",
          },
          {
            label: "Fat",
            value: progressData.logged_macros.fat || 0,
            color: "#FF69B4",
          },
        ]);
      } catch {
        setMacroData(defaultMacroData);
      }
    };
    fetchProgress();
  }, []);

  return (
    <CustomSafeAreaView edges={["left", "right"]} className="flex-1">
      <View className="flex-1 bg-gray">
        {/* Header */}
        <View className="flex-row bg-white items-center justify-between px-5 pt-4 pb-5 mb-5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
          >
            <Text className="text-[22px]">‹</Text>
          </TouchableOpacity>
          <Text className="text-[20px] font-semibold text-[#222] text-center">
            AI Recipe suggestions
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView className="pb-8">
          {/* Macros Donut Row */}
          <View className="flex-col bg-white items-start mt-3 px-5 pt-3 pb-10 mb-4">
            <Text className="text-lg text-black mt-2 text-center mb-3 font-medium">
              Remaining today
            </Text>
            <View className="flex-row w-full justify-between items-center">
              {macroData.map((macro, index) => {
                const target =
                  macrosPreferences?.[macroTypeToPreferenceKey[macro.label]] ||
                  0;
                const consumed = macro.value;
                const remaining = Math.max(0, target - consumed);
                return (
                  <View key={`${macro.label}-${index}`}>
                    <View className="h-[100px] w-[100px] relative">
                      <CircularProgress
                        size={100}
                        strokeWidth={12}
                        textSize={16}
                        consumed={`${remaining}g`}
                        total={target}
                        color={macro.color}
                        backgroundColor="#d0e8d1"
                        label={macro.label}
                        showLabel={false}
                      />
                      <Text className="text-sm text-black mt-2 text-center font-medium">
                        {macro.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Info Card */}
          <View className="bg-[#0088D140] flex-row px-8 mt-5 justify-center items-center rounded-xl mx-5 p-4 mb-[18px]">
            <Image
              source={IMAGE_CONSTANTS.magicWandAltIcon}
              className="w-[32px] h-[32px] ml-2 mr-3"
            />
            <Text className="text-[#222] text-[15px] text-left">
              Personalized recipes tailored to your dietary preferences and
              macro goals, designed to help you reach your targets effectively.
            </Text>
          </View>

          <Text className="text-base font-bold text-[#222] mx-5 mb-2.5">
            ✨ Suggested recipes
          </Text>

          {loading ? (
            <View className="flex items-center justify-center py-8">
              <ActivityIndicator size="large" color="#19a28f" />
              <Text className="text-[#888] mt-2">
                Finding recipe suggestions...
              </Text>
            </View>
          ) : (
            <>
              {error ? (
                <View className="flex items-center justify-center py-8">
                  <Image
                    source={IMAGE_CONSTANTS.warningIcon}
                    className="w-[48px] h-[48px] mb-3 opacity-50"
                  />
                  <Text className="text-[#888] text-center text-base">
                    Unable to load recipe suggestions
                  </Text>
                  <Text className="text-[#888] text-center text-sm mt-1">
                    Please check your connection and try again
                  </Text>
                  <TouchableOpacity
                    onPress={handleRetry}
                    className="mt-4 px-6 py-2 bg-primaryLight rounded-full"
                  >
                    <Text className="text-white font-medium">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {recipes.length === 0 && (
                    <Text className="text-center text-[#888] mt-6">
                      No recipe suggestions found.
                    </Text>
                  )}
                  {recipes.map((recipe, idx) => (
                    <TouchableOpacity
                      key={idx}
                      className="flex-row bg-white rounded-xl mx-5 mb-4 p-4 shadow-sm"
                      onPress={() => handleRecipeSelect(recipe)}
                    >
                      <Image
                        source={IMAGE_CONSTANTS.logo}
                        className="w-[70px] h-[70px] rounded-lg mr-3"
                      />
                      <View className="flex-col flex-1 justify-center mb-1">
                        <Text className="text-sm font-medium text-[#222] mb-3">
                          {recipe.name}
                        </Text>
                        {/* <Text className="text-sm text-[#666] mb-3 line-clamp-2">{recipe.description}</Text> */}

                        <View className="flex-row items-center gap-2">
                          <View className="flex-row items-center justify-center gap-1">
                            <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-kryptoniteGreen rounded-full">
                              <Image
                                source={IMAGE_CONSTANTS.caloriesIcon}
                                className="w-[8px] h-[8px] object-fill"
                              />
                            </View>
                            <Text className="text-xs text-black text-center font-medium">
                              {recipe.calories} cal
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                              <Text className="text-white text-[10px] text-center font-medium">
                                C
                              </Text>
                            </View>
                            <Text className="text-xs text-textMediumGrey text-center font-medium">
                              {recipe.carbs}g
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                              <Text className="text-white text-[10px] text-center font-medium">
                                F
                              </Text>
                            </View>
                            <Text className="text-xs text-textMediumGrey text-center font-medium">
                              {recipe.fat}g
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                              <Text className="text-white text-[10px] text-center font-medium">
                                P
                              </Text>
                            </View>
                            <Text className="text-xs text-textMediumGrey text-center font-medium">
                              {recipe.protein}g
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </CustomSafeAreaView>
  );
};

export default AiMealSuggestionsScreen;
