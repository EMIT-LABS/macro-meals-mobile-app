import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { IMAGE_CONSTANTS } from "../constants/imageConstants";
import { RootStackParamList } from "../types/navigation";
import FavoritesService from "../services/favoritesService";
import { MealFeedback, mealService } from "../services/mealService";
import useStore from "../store/useStore";
import { RateMacroMeals } from "src/components/RateMacroMeals";
import { useMixpanel } from "@macro-meals/mixpanel/src";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// type MacroColorKey = keyof typeof macroColors;


interface RouteParams{
    defaultDate?: string;

}

const ScannedMealBreakdownScreen: React.FC = () => {
    
  const navigation =
    useNavigation<
      NativeStackNavigationProp<
        RootStackParamList,
        "ScannedMealBreakdownScreen"
      >
    >();
     const route = useRoute<RouteProp<{ ScannedMealBreakdownScreen: RouteParams }, 'ScannedMealBreakdownScreen'>>();
        const params = route.params || {};
        const { defaultDate } = params;
  // Accept any shape for meal, fallback to empty object
  const { meal = {} } = (route.params as { meal?: any }) || {};

  // Extract fields with fallback
  console.log("Full meal object received:", JSON.stringify(meal, null, 2));
  const mealName = meal.name || "Scanned meal";
  const mealImage = meal.image
    ? { uri: meal.image }
    : IMAGE_CONSTANTS.sampleFood;
  const macros = meal.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const detectedIngredients = meal.detected_ingredients || [];
  const scannedImage = meal.scannedImage || "";
  console.log("Extracted scannedImage:", scannedImage);
  const mixpanel = useMixpanel();
  const token = useStore((state) => state.token);

  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  // const [matchPercent] = useState<number>(98);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    // Fire only on initial mount
    mixpanel?.track({
      name: "meal_scan_results_viewed",
      properties: {
        meal_name: mealName,
        calories: macros.calories,
        protein_g: macros.protein,
        carbs_g: macros.carbs,
        fats_g: macros.fat,
      },
    });
  }, []);
  // Check if meal is in favorites on component mount
  useEffect(() => {
    checkIfFavorite();
  }, []);

  const checkIfFavorite = async (): Promise<void> => {
    try {
      const isInFavorites = await FavoritesService.isFavorite(
        mealName,
        meal.restaurant?.name
      );
      setIsFavorite(isInFavorites);
    } catch (error) {
      console.error("Error checking favorites:", error);
    }
  };

  const handleAddToLog = async (): Promise<void> => {
    mixpanel?.track({
      name: "add_to_log_from_meal_scan_submitted",
      properties: {
        meal_name: mealName,
        calories: macros.calories,
        protein_g: macros.protein,
        carbs_g: macros.carbs,
        fats_g: macros.fat,
        amount: 1,
        serving_size_g: "grams", 
      },
    });
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    setIsLogging(true);
    try {
      // Prepare the meal data for logging - similar to AddMealScreen
      const mealRequest = {
        name: mealName,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        meal_type: "lunch", // Default to lunch, could be made configurable
        meal_time: defaultDate,
        amount: 1,
        serving_size: "grams",
        description: `${mealName} from ${
          meal.restaurant?.name || "scanned meal"
        }`,
        logging_mode: "scanned",
        photo: meal.image
          ? {
              uri: meal.image,
              type: "image/jpeg",
              name: "meal_photo.jpg",
            }
          : undefined,
        // Include favorite status if the meal is favorited
        ...(isFavorite && { favorite: true }),
      };

      console.log("Logging meal:", mealRequest);

      // Log the request data for debugging
      console.log("Meal request data:", JSON.stringify(mealRequest, null, 2));

      // Use the mealService to log the meal
      const loggedMeal = await mealService.logMeal(mealRequest);

      // Set first meal status for this user
      const userEmail = useStore.getState().profile?.email;
      if (userEmail) {
        useStore.getState().setUserFirstMealStatus(userEmail, true);
      }

      console.log("Meal logged successfully:", loggedMeal);

      Alert.alert("Success", "Meal added to today's log!", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to main dashboard
            navigation.navigate("MainTabs", { screen: "Meals" });
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error logging meal:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add meal to log. Please try again."
      );
    } finally {
      setIsLogging(false);
    }
  };

  const handleOnLike = async () => {
    try {
      console.log("THE scanned image:", scannedImage);
      await mealService.mealFeedback(scannedImage, mealName, {
        feedback: MealFeedback.ThumbUp,
        barcode: meal.barcode || "",
        mealImage: scannedImage,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to like meal. Please try again.");
      console.error("Error liking meal:", error);
    }
  };
  const handleOnDislike = async () => {
    try {
      await mealService.mealFeedback(scannedImage, mealName, {
        feedback: MealFeedback.ThumbDown,
        barcode: meal.barcode || "",
        mealImage: scannedImage,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to dislike meal. Please try again.");
      console.error("Error disliking meal:", error);
    }
  };

  const toggleFavorite = async (): Promise<void> => {
    // Trigger animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Convert Meal to FavoriteMeal format
      const mealObj = {
        name: meal.name,
        macros: meal.macros,
        image: meal.image || "",
        restaurant: meal.restaurant,
        amount: (meal as any).amount || 1,
        serving_size: 1,
        serving_unit: (meal as any).serving_unit || "serving",
        no_of_servings: 1,
        meal_type: (meal as any).mealType || "other",
        meal_time: (meal as any).meal_time || new Date().toISOString(),
        logging_mode: (meal as any).logging_mode || "ai_suggested",
        favorite: isFavorite,
      };
      const newFavoriteStatus = await FavoritesService.toggleFavorite(mealObj);
      setIsFavorite(newFavoriteStatus);

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

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {/* Top Image */}
          <View style={{ height: SCREEN_HEIGHT * 0.43, width: "100%" }}>
            <Image
              source={mealImage}
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
                onPress={() => navigation.goBack()}
                className="flex-row w-9 h-9 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Image
                  source={IMAGE_CONSTANTS.backButton}
                  className="w-2.5 h-5"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleFavorite}
                className="w-9 h-9 rounded-full justify-center items-center bg-[#F5F5F5]"
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Image
                    source={
                      isFavorite
                        ? IMAGE_CONSTANTS.star
                        : IMAGE_CONSTANTS.starIcon
                    }
                    className="h-[16px] w-[16px]"
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Meal Title & Time */}
          <View className="flex-row items-center justify-between px-5 mt-6 mb-2">
            <Text className="text-2xl font-semibold text-black">
              {mealName}
            </Text>
            {/* Optionally add time if available */}
            {/* <View className="bg-[#F5F5F5] rounded-full px-3 py-1">
              <Text className="text-xs text-[#555] font-medium">11:00am</Text>
            </View> */}
          </View>

          {/* AI Detection Results Card */}
          <View className="mx-5 mt-2 mb-4 rounded-xl p-5 bg-[#F7F7F7]">
            <Text className="text-lg font-semibold mb-3 text-black">
              AI detection results
            </Text>
            {/* Detected Ingredients */}
            {detectedIngredients.length > 0 && (
              <View className="mb-2">
                <View className="flex-col flex-wrap">
                  {detectedIngredients.map(
                    (ingredient: string, idx: number) => (
                      <View key={ingredient + idx} className="py-1 mr-2 mb-2">
                        <Text className="text-base font-normal text-[#333333]">
                          {ingredient}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}
            {/* Items (dishes) */}
            {/* {items.length > 0 ? (
              <View className="space-y-2">
                {items.map((item: any, idx: number) => (
                  <View key={item.name + idx} className="flex-row justify-between">
                    <Text className="text-[#222] text-base">{item.name}</Text>
                    <Text className="text-[#222] text-base font-medium">{item.amount}{item.serving_unit ? ` ${item.serving_unit}` : ''}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[#888] text-sm">No items detected.</Text>
            )} */}
          </View>

          {/* Macros Summary Row */}
          <View className="flex-row justify-between mx-5 mb-6">
            <View className="flex-1 items-center h-[75px] w-[80px] bg-[#F2F2F2F2] rounded-xl py-3 mx-1">
              <Text className="text-xs text-gloomyPurple font-medium mb-1">
                Protein
              </Text>
              <Text className="text-xl font-bold text-gloomyPurple">
                {macros.protein}g
              </Text>
            </View>
            <View className="flex-1 items-center bg-[#FEF9E6] rounded-xl py-3 mx-1">
              <Text className="text-xs text-[#FFC008] font-medium mb-1">
                Carbs
              </Text>
              <Text className="text-xl font-bold text-[#FFC008]">
                {macros.carbs}g
              </Text>
            </View>
            <View className="flex-1 items-center bg-[#FCF3FC] rounded-xl py-3 mx-1">
              <Text className="text-xs text-lavenderPink font-medium mb-1">
                Fat
              </Text>
              <Text className="text-xl font-bold text-lavenderPink">
                {macros.fat}g
              </Text>
            </View>
            <View className="flex-1 items-center bg-[#ECF5ED] rounded-xl py-3 mx-1">
              <Text className="text-xs text-kryptoniteGreen font-medium mb-1">
                Calories
              </Text>
              <Text className="text-xl font-bold text-kryptoniteGreen">
                {macros.calories}
              </Text>
            </View>
          </View>
          <RateMacroMeals onLike={handleOnLike} onDislike={handleOnDislike} />
          <View className="h-16 mb-14" />
        </ScrollView>

        {/* Fixed Button at Bottom */}
        <View className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-[20px] shadow-lg">
          <TouchableOpacity
            className="w-full h-[56px] rounded-full bg-primaryLight items-center justify-center"
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

export default ScannedMealBreakdownScreen;
