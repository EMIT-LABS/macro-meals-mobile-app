import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import Header from "../components/Header";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
import { CircularProgress } from "../components/CircularProgress";
import { fetchUserPreferences, updateMacros } from "src/services/macroService";
import axios from "axios";
import { useMixpanel } from "@macro-meals/mixpanel/src";
import { usePosthog } from "@macro-meals/posthog_service/src";

type MacroKey = "protein" | "fat" | "carbs";
type MacroResponse = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};
const macroConfig: { label: string; key: MacroKey; suffix: string }[] = [
  { label: "Protein", key: "protein", suffix: "g" },
  { label: "Fat", key: "fat", suffix: "g" },
  { label: "Carbs", key: "carbs", suffix: "g" },
];

const AdjustTargetsScreen: React.FC = () => {
  const [macros, setMacros] = useState<MacroResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const mixpanel = useMixpanel();
    const posthog = usePosthog();


  // Fetch macros on mount
  useEffect(() => {
    loadMacros();
  }, []);

  const loadMacros = async () => {
    setLoading(true);
    try {
      const data = await fetchUserPreferences();
      setMacros(data);
    } catch (e: any) {
      console.log("Error loading macros:", e);

      if (axios.isAxiosError(e) && !e.response) {
        Alert.alert(
          "Network Error",
          "Please check your internet connection and try again."
        );
      } else if (axios.isAxiosError(e) && e.response) {
        const message =
          e.response.data?.message || "Could not load macro targets.";
        Alert.alert("Server Error", message);
      } else {
        Alert.alert("Error", "Could not load macro targets.");
      }
    }
    setLoading(false);
  };
  useEffect(() => {
    if (macros) {
      mixpanel?.track({
        name: "adjust_targets_screen_viewed",
        properties: {},
      });
      posthog?.track({
        name: "adjust_targets_screen_viewed",
        properties: {
          current_calories: macros.calories,
          current_protein: macros.protein,
          current_carbs: macros.carbs,
          current_fats: macros.fat,
        },
      });
    }
  }, [macros]);

  const openModal = (macro: {
    label: string;
    key: MacroKey;
    suffix: string;
  }) => {
    mixpanel?.track({
      name: "targets_field_updated",
      properties: {
        field: macro.key,
        label: macro.label,
      },
    });
    posthog?.track({
      name: "targets_field_updated",
      properties: {
        field: macro.key,
        label: macro.label,
      },
    });
    setSelectedMacro(macro);
    setInputValue(macros?.[macro.key]?.toString() ?? "");
    setInputError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMacro(null);
    setInputValue("");
    setInputError(null);
  };

  const handleSave = async () => {
    const num = Number(inputValue);
    if (!inputValue || isNaN(num) || num <= 0 || num > 100000) {
      setInputError("Enter a valid positive number.");
      return;
    }
    setInputError(null);
    setLoading(true);
    try {
      if (!macros || !selectedMacro) throw new Error("Missing state");
      // Build and send the new full macro object
      const updatedMacros = {
        ...macros,
        [selectedMacro.key]: num,
      };
      await updateMacros(updatedMacros);
      mixpanel?.track({
        name: "targets_saved",
        properties: {
          updated_field: selectedMacro.key,
          new_value: num,
        },
      });
       posthog?.track({
        name: "targets_saved",
        properties: {
          updated_field: selectedMacro.key,
          new_value: num,
        },
      });
      closeModal();
      await loadMacros(); // Refresh from backend after update
    } catch {
      Alert.alert("Error", "Could not update macro target.");
    }
    setLoading(false);
  };

  if (loading && !macros) {
    return (
      <CustomSafeAreaView>
        <View className="flex-1 justify-center items-center bg-[#f6f6f6]">
          <ActivityIndicator size="large" color="#009688" />
        </View>
      </CustomSafeAreaView>
    );
  }

  return (
    <CustomSafeAreaView>
      <View className="flex-1 bg-[#f6f6f6]">
        <Header title="Adjust Targets" />
        <View className="bg-[#01675B] px-6 py-10 items-center">
          <Text className="text-white text-base font-semibold text-center mb-4">
            Your current goal
          </Text>
          <CircularProgress
            size={120}
            strokeWidth={8}
            consumed={String(macros?.calories ?? 0)}
            total={macros?.calories || 0}
            color="#fff"
            backgroundColor="rgba(255,255,255,0.2)"
            label="calories/day"
          />
        </View>
        <ScrollView
          className="flex-1 mt-3"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-black text-base font-medium my-3 py-2 px-4">
            Tap on any value to set your preferred macro targets.
          </Text>
          {macroConfig.map((macro) => (
            <TouchableOpacity
              key={macro.key}
              onPress={() => openModal(macro)}
              className="w-full"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between py-4 bg-white border-b border-b-[#f0f0f0]">
                <Text className="text-black text-base font-semibold pl-6">
                  {macro.label}
                </Text>
                <Text className="text-[#009688] text-lg font-bold pr-6">
                  {macros?.[macro.key]}
                  {macro.suffix}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Modal logic remains unchanged */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/40">
            <View className="bg-white rounded-2xl px-6 pt-6 pb-4 w-11/12 max-w-md shadow-lg relative">
              <Pressable
                onPress={closeModal}
                className="absolute top-4 right-4 z-10"
                accessibilityLabel="Close dialog"
              >
                <Text className="text-2xl text-gray-400">✕</Text>
              </Pressable>
              <Text className="text-xl mb-6 text-center">
                {selectedMacro?.label}/Day
              </Text>
              <TextInput
                className="border-b border-gray-300 rounded-lg px-4 py-2 mb-2 text-lg text-left"
                keyboardType="numeric"
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Enter value"
                autoFocus
              />
              {inputError ? (
                <Text className="text-red-500 text-sm mb-3 text-center">
                  {inputError}
                </Text>
              ) : null}
              <View className="my-4">
                <TouchableOpacity
                  className={`bg-[#009688] rounded-full py-3 mb-3 self-center w-1/2`}
                  onPress={handleSave}
                >
                  <Text className="text-white text-center text-base font-semibold">
                    Save changes
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="py-2" onPress={closeModal}>
                <Text className="text-center text-[#333333] text-base font-semibold opacity-80">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </CustomSafeAreaView>
  );
};

export default AdjustTargetsScreen;
