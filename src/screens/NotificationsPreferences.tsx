import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
import Header from "../components/Header";
import { userService } from "../services/userService";
import { useMixpanel } from "@macro-meals/mixpanel/src";
import { usePosthog } from "@macro-meals/posthog_service/src";

type TogglesState = {
  mealReminders?: boolean;
};

type LoadingState = {
  initial: boolean;
  mealReminders: boolean;
};

export default function NotificationsPreferences() {
  const [toggles, setToggles] = useState<TogglesState>({
    mealReminders: undefined,
  });
  const [loading, setLoading] = useState<LoadingState>({
    initial: true,
    mealReminders: false,
  });
  const [showDetails, setShowDetails] = useState(false);
  const mixpanel = useMixpanel();
    const posthog = usePosthog();


  useEffect(() => {
    if (!loading.initial && typeof toggles.mealReminders !== "undefined") {
      mixpanel?.track({
        name: "notifications_screen_viewed",
        properties: {
          meal_reminders_enabled: toggles.mealReminders,
        },
      });
    }
  }, [loading.initial, toggles.mealReminders]);

  useEffect(() => {
    let isMounted = true;
    async function fetchPreferences() {
      setLoading((prev) => ({ ...prev, initial: true }));
      try {
        const user = await userService.getProfile();
        if (isMounted) {
          setToggles({ mealReminders: !!user.meal_reminder_preferences_set });
        }
      } catch {
        if (isMounted) {
          Alert.alert("Error", "Could not load preferences.");
        }
      } finally {
        if (isMounted) {
          setLoading((prev) => ({ ...prev, initial: false }));
        }
      }
    }
    fetchPreferences();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (value: boolean) => {
    if (loading.mealReminders) return;
    setToggles((prev) => ({ ...prev, mealReminders: value }));
    setLoading((prev) => ({ ...prev, mealReminders: true }));
    try {
      await userService.updateProfile({
        meal_reminder_preferences_set: value,
      });
      mixpanel?.track({
        name: "notification_toggle_changed",
        properties: {
          notification: "meal_reminders",
          enabled: value,
        },
      });
        posthog?.track({
        name: "notification_toggle_changed",
        properties: {
          toggle_name: "meal_reminders",
          new_state: value,
        },
      });
    } catch {
      setToggles((prev) => ({ ...prev, mealReminders: !value }));
      Alert.alert("Error", "Could not update preference. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, mealReminders: false }));
    }
  };

  if (loading.initial || typeof toggles.mealReminders === "undefined") {
    return (
      <CustomSafeAreaView>
        <Header title="Notification Preferences" />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#009688" />
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView>
      <Header title="Notification Preferences" />
      <View className="bg-white px-4 pt-6">
        {/* Meal Reminders */}
        <View className="mb-4">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDetails((prev) => !prev)}
            className="flex-row items-center justify-between px-2 py-4 rounded-lg bg-white"
            accessibilityRole="button"
            accessibilityLabel="Show meal reminder details"
          >
            <View className="flex-1">
              <Text className="text-lg font-medium text-[#121212] my-1">
                Meal reminders
              </Text>
              <Text className="text-sm font-medium text-[#4F4F4F] my-1">
                Get reminders to log breakfast, lunch and dinner
              </Text>
            </View>
            <View className="flex-row items-center">
              {loading.mealReminders && (
                <ActivityIndicator
                  size="small"
                  color="#009688"
                  style={{ marginRight: 8 }}
                />
              )}
              <Switch
                value={toggles.mealReminders}
                onValueChange={handleToggle}
                disabled={loading.mealReminders}
                ios_backgroundColor="#ddd"
                trackColor={{ false: "#ddd", true: "#009688" }}
                thumbColor={
                  Platform.OS === "android"
                    ? toggles.mealReminders
                      ? "#009688"
                      : "#f4f3f4"
                    : undefined
                }
              />
            </View>
          </TouchableOpacity>
          {showDetails && (
            <View className="p-3 bg-[#F5F5F5]">
              <View className="flex-row justify-between my-1">
                <Text className="text-sm text-[#121212]">Breakfast</Text>
                <Text className="text-sm text-[#333333]">08:00 AM</Text>
              </View>
              <View className="flex-row justify-between my-1">
                <Text className="text-sm text-[#121212]">Lunch</Text>
                <Text className="text-sm text-[#333333]">12:30 PM</Text>
              </View>
              <View className="flex-row justify-between my-1">
                <Text className="text-sm text-[#121212]">Dinner</Text>
                <Text className="text-sm text-[#333333]">07:00 PM</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </CustomSafeAreaView>
  );
}
