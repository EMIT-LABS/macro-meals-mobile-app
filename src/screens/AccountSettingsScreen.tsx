import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Keyboard,
  Switch,
} from "react-native";
import { userService } from "../services/userService";
import { authService } from "../services/authService";
import useStore from "../store/useStore";
import CustomSafeAreaView from "src/components/CustomSafeAreaView";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMixpanel } from "@macro-meals/mixpanel";
import { Picker } from "@react-native-picker/picker";
import { macroMealsCrashlytics } from "@macro-meals/crashlytics";
import { useGoalsFlowStore } from "src/store/goalsFlowStore";
import Header from "src/components/Header";
import { useSyncBodyMetricToBackend } from "src/components/hooks/useBodyMetricsUpdate";
import { usePosthog } from "@macro-meals/posthog_service/src";

function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AccountSettingsScreen() {
  const [_user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [tempHeightCm, setTempHeightCm] = useState<number | null>(null);
  const [tempHeightFt, setTempHeightFt] = useState<number | null>(null);
  const [tempHeightIn, setTempHeightIn] = useState<number | null>(null);
  const [tempWeightKg, setTempWeightKg] = useState<number | null>(null);
  const [tempWeightLb, setTempWeightLb] = useState<number | null>(null);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const userRef = useRef<any>(null);
  const posthog = usePosthog()
  const { setAuthenticated } = useStore();
  const debouncedPatch = useRef<{ [key: string]: (...args: any[]) => void }>(
    {}
  );

  const mixpanel = useMixpanel();
  useEffect(() => {
    if (_user && _user.id) {
      mixpanel?.track({
        name: "account_settings_screen_viewed",
        properties: {
          user_id: _user.id,
          email: _user.email,
          is_pro: _user.is_pro,
        },
      });
      posthog?.track({
        name: "account_settings_screen_viewed",
        properties: {
          user_id: _user.id,
          email: _user.email,
          is_pro: _user.is_pro,
          platform:Platform.OS
        },
      });
    }
  }, [_user]);
  // function floatFeetToFtIn(floatFeet: number) {
  //   const ft = Math.floor(floatFeet);
  //   const inch = Math.round((floatFeet - ft) * 12);
  //   return { ft, inch };
  // }
  const {
    height_unit_preference,
    setHeightUnitPreference,
    heightFt,
    setHeightFt,
    heightIn,
    setHeightIn,
    heightCm,
    setHeightCm,
    weight_unit_preference,
    setWeightUnitPreference,
    weightLb,
    setWeightLb,
    weightKg,
    setWeightKg,
  } = useGoalsFlowStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userService.getProfile();
        setUser(data);
        console.log("[HYDRATE] Got user from backend:", data);
        userRef.current = data;
        setLocalValues({
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          height: data?.height?.toString() || "",
          weight: data?.weight?.toString() || "",
        });

        if (
          data.height_unit_preference === "imperial" &&
          typeof data.height === "number"
        ) {
          let ft = Math.floor(data.height);
          let inch = Math.round((data.height - ft) * 12);
          if (inch >= 12) {
            ft += 1;
            inch = 0;
          }
          setHeightFt(ft);
          setHeightIn(inch);
          setHeightCm(null);
        } else if (
          data.height_unit_preference === "metric" &&
          typeof data.height === "number"
        ) {
          setHeightCm(data.height);
          setHeightFt(null);
          setHeightIn(null);
        }
        setHeightUnitPreference(data.height_unit_preference ?? "metric");

        if (
          data.weight_unit_preference === "imperial" &&
          typeof data.weight === "number"
        ) {
          setWeightLb(data.weight);
          setWeightKg(null);
        } else if (
          data.weight_unit_preference === "metric" &&
          typeof data.weight === "number"
        ) {
          setWeightKg(data.weight);
          setWeightLb(null);
        }
        setWeightUnitPreference(data.weight_unit_preference ?? "metric");
        // --- End hydration ---
      } catch {
        setUser(null);
        userRef.current = null;
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const updateUserSilently = useCallback(
    (newData: any) => {
      userRef.current = newData;
      // Only update user state if the field being updated is not currently focused
      if (!focusedField) {
        setUser(newData);
      }
    },
    [focusedField]
  );

  // Update Mixpanel user properties when user data changes
  const updateMixpanelUserProperties = useCallback(
    (updatedFields: any) => {
      if (!mixpanel) return;

      const propertiesToUpdate: any = {};

      // Map backend field names to Mixpanel property names
      if (updatedFields.first_name !== undefined) {
        propertiesToUpdate.first_name = updatedFields.first_name;
      }
      if (updatedFields.last_name !== undefined) {
        propertiesToUpdate.last_name = updatedFields.last_name;
      }
      if (updatedFields.sex !== undefined) {
        propertiesToUpdate.gender = updatedFields.sex;
      }
      if (updatedFields.dob !== undefined) {
        propertiesToUpdate.birthday = updatedFields.dob;
      }
      if (updatedFields.height !== undefined) {
        propertiesToUpdate.height = updatedFields.height;
      }
      if (updatedFields.weight !== undefined) {
        propertiesToUpdate.weight = updatedFields.weight;
      }

      // Only update if there are properties to update
      if (Object.keys(propertiesToUpdate).length > 0) {
        mixpanel.setUserProperties(propertiesToUpdate);
        console.log(
          "[MIXPANEL] 📝 Updated user properties:",
          propertiesToUpdate
        );
      }
    },
    [mixpanel]
  );

  const getDebouncedPatch = (field: string) => {
    if (!debouncedPatch.current[field]) {
      debouncedPatch.current[field] = debounce(async (value: any) => {
        console.log(`[PATCH] Field: ${field}, Value:`, value); // <-- ADD THIS
        if (!value || value === userRef.current[field]) return;

        const oldValue = userRef.current[field]; 
        setUpdating((prev) => ({ ...prev, [field]: true }));
        try {
          const patch: any = {};
          patch[field] = value;
          console.log("[PATCH] Sending to backend:", patch);
          await userService.updateProfile(patch);
          mixpanel?.track({
            name: "account_field_updated",
            properties: {
              user_id: userRef.current?.id,
              field: field,
              new_value: value,
            },
          });
          posthog?.track({
            name: "account_field_updated",
            properties: {
              user_id: userRef.current?.id,
              field: field,
              old_value:oldValue,
              new_value: value,
            },
          });
          console.log("[PATCH] Backend update successful", oldValue);
          // Update Mixpanel user properties
          updateMixpanelUserProperties(patch);

          // Update user data in background without affecting the UI
          setTimeout(async () => {
            try {
              const freshUserData = await userService.getProfile();
              updateUserSilently(freshUserData);
            } catch (e) {
              console.error("[PATCH] Error updating:", e);
            }
          }, 1000);
        } catch {
          Alert.alert("Error", "Failed to update profile");
          setLocalValues((prev) => ({
            ...prev,
            [field]: userRef.current[field]?.toString() || "",
          }));
        } finally {
          setUpdating((prev) => ({ ...prev, [field]: false }));
        }
      }, 1500);
    }
    return debouncedPatch.current[field];
  };

  useSyncBodyMetricToBackend("weight", (val) =>
    setUpdating((prev) => ({ ...prev, weight: val }))
  );
  useSyncBodyMetricToBackend("height", (val) =>
    setUpdating((prev) => ({ ...prev, height: val }))
  );

  const handleFieldChange = (field: string, value: any) => {
   // Validate first_name and last_name fields
  if (field === 'first_name' || field === 'last_name') {
    // Remove emojis and allow only letters, spaces, hyphens, and apostrophes
    const sanitized = value.replace(/[^\p{L}\s'-]/gu, '');
    
    // Prevent only whitespace
    if (sanitized.trim().length === 0 && sanitized.length > 0) {
      return; // Don't update if it's only spaces
    }
    
    setLocalValues((prev) => ({ ...prev, [field]: sanitized }));
    getDebouncedPatch(field)(sanitized.trim()); // Trim before sending to backend
  } else {
    setLocalValues((prev) => ({ ...prev, [field]: value }));
    getDebouncedPatch(field)(value);
  }
};
  // When field loses focus, update the user state
  const handleFieldBlur = (field: string) => {
    console.log("[HANDLE FIELD BLUR] Field:", field);
    setFocusedField(null);
    // Update the user state with the latest data
    setUser(userRef.current);
  };

  const handleHeightUnitChange = (newUnit: "imperial" | "metric") => {
    if (newUnit === height_unit_preference) return;
    mixpanel?.track({
      name: "height_unit_toggled",
      properties: {
        user_id: _user?.id,
        from_unit: height_unit_preference,
        to_unit: newUnit,
      },
    });
      posthog?.track({
      name: "height_unit_toggled",
      properties: {
        user_id: _user?.id,
        from_unit: height_unit_preference,
        to_unit: newUnit,
      },
    });
    if (
      newUnit === "imperial" &&
      typeof heightCm === "number" &&
      !isNaN(heightCm)
    ) {
      // Prefill ft/in fields for user convenience
      const totalInches = heightCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round(totalInches % 12);
      setHeightFt(ft);
      setHeightIn(inch);
      setHeightCm(null);
    } else if (
      newUnit === "metric" &&
      typeof heightFt === "number" &&
      typeof heightIn === "number" &&
      !isNaN(heightFt) &&
      !isNaN(heightIn)
    ) {
      // Prefill cm field for user convenience
      const cm = Math.round(heightFt * 30.48 + heightIn * 2.54);
      setHeightCm(cm);
      setHeightFt(null);
      setHeightIn(null);
    }
    setHeightUnitPreference(newUnit);
  };

  const handleWeightUnitChange = (newUnit: "imperial" | "metric") => {
    if (newUnit === weight_unit_preference) return;
    mixpanel?.track({
      name: "weight_unit_toggled",
      properties: {
        user_id: _user?.id,
        from_unit: weight_unit_preference,
        to_unit: newUnit,
      },
    });
     posthog?.track({
      name: "weight_unit_toggled",
      properties: {
        user_id: _user?.id,
        from_unit: weight_unit_preference,
        to_unit: newUnit,
      },
    });
    if (newUnit === "imperial") {
      if (typeof weightKg === "number" && !isNaN(weightKg)) {
        const lbs = Math.round(weightKg * 2.20462);
        setWeightLb(lbs);
      } else {
        // fallback to 0 or empty string
        setWeightLb(0);
      }
      setWeightKg(null);
    } else if (newUnit === "metric") {
      if (typeof weightLb === "number" && !isNaN(weightLb)) {
        const kg = Math.round(weightLb / 2.20462);
        setWeightKg(kg);
      } else {
        setWeightKg(0);
      }
      setWeightLb(null);
    }
    setWeightUnitPreference(newUnit);
  };

  // const onHeightFtChange = (v: string) => {
  //   const ft = Number(v.replace(/[^0-9]/g, ""));
  //   setHeightFt(ft);
  // };

  // const onHeightInChange = (v: string) => {
  //   let inch = Number(v.replace(/[^0-9]/g, ""));
  //   if (inch > 11) inch = 11;
  //   setHeightIn(inch);
  // };

  // const handleMultiFieldChange = (fields: Record<string, any>) => {
  //   setLocalValues((prev) => ({ ...prev, ...fields }));
  //   // Use specific field key for debouncing to avoid conflicts
  //   if (fields.height !== undefined) {
  //     getDebouncedPatch("height")(fields);
  //   } else if (fields.weight !== undefined) {
  //     getDebouncedPatch("weight")(fields);
  //   }
  // };
  // const onHeightBlur = () => {
  //   let patchObj: Record<string, any> = {};
  //   if (height_unit_preference === "imperial") {
  //     const ft = Number(heightFt) || 0;
  //     const inch = Number(heightIn) || 0;
  //     const floatFeet = ft + inch / 12;
  //     patchObj = {
  //       height: floatFeet,
  //       height_unit_preference: "imperial",
  //     };
  //   } else {
  //     const cm = Number(heightCm) || 0;
  //     patchObj = {
  //       height: cm,
  //       height_unit_preference: "metric",
  //     };
  //   }
  //   handleMultiFieldChange(patchObj);
  // };

  // const onWeightBlur = () => {
  //   let patchObj: Record<string, any> = {};
  //   if (weight_unit_preference === "imperial") {
  //     patchObj = {
  //       weight: Number(weightLb) || 0,
  //       weight_unit_preference: "imperial",
  //     };
  //   } else {
  //     patchObj = {
  //       weight: Number(weightKg) || 0,
  //       weight_unit_preference: "metric",
  //     };
  //   }
  //   handleMultiFieldChange(patchObj);
  // };
  const handleDeleteAccount = () => {
    mixpanel?.track({
      name: "delete_account_clicked",
      properties: {
        user_id: userRef.current?.id,
        email: userRef.current?.email,
      },
    });
     posthog?.track({
      name: "delete_account_clicked",
      properties: {
        user_id: userRef.current?.id,
        email: userRef.current?.email,
        entry_point:'account_settings'
      },
    });
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            mixpanel?.track({
              name: "delete_account_cancelled",
              properties: {
                user_id: userRef.current?.id,
                email: userRef.current?.email,
              },
            });
            posthog?.track({
              name: "delete_account_cancelled",
              properties: {
                user_id: userRef.current?.id,
                email: userRef.current?.email,
                dialog_state:'cancel',
              },
            });
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Track account deletion in Mixpanel
              mixpanel?.track({
                name: "delete_account_confirmed",
                properties: {
                  user_id: userRef.current?.id,
                  email: userRef.current?.email,
                  account_age_days: userRef.current?.created_at
                    ? Math.floor(
                        (Date.now() -
                          new Date(userRef.current.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0,
                },
              });
               posthog?.track({
                name: "delete_account_confirmed",
                properties: {
                  user_id: userRef.current?.id,
                  email: userRef.current?.email,
                  account_age_days: userRef.current?.created_at
                    ? Math.floor(
                        (Date.now() -
                          new Date(userRef.current.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0,
                },
              });
              await authService.deleteUser();
              await authService.logout();

              // Clear user data from Crashlytics
              await macroMealsCrashlytics.clearUserAttributes();
              await macroMealsCrashlytics.setUserId("");

              setAuthenticated(false, "", "");
            } catch (error) {
              console.error("Error during account deletion:", error);
            }
          },
        },
      ]
    );
  };

  const validateWeightChange = (
    newWeight: number,
    unit: "kg" | "lb",
    onSuccess: () => void
  ) => {
    const { fitnessGoal, targetWeight } = useGoalsFlowStore.getState();
    const weightKg =
      unit === "kg" ? newWeight : Math.round(newWeight / 2.20462);
    const targetKg = targetWeight;
    console.log("the fitness goal is:", fitnessGoal); 
    console.log("the targert weight is:", targetWeight);
    if (
      fitnessGoal?.toLowerCase().includes("lose") &&
      targetKg !== null &&
      weightKg <= targetKg
    ) {
      Alert.alert(
        "Weight Conflict",
        "This weight conflicts with your goal. Please go to Adjust Goals to update your plan.",
        [{ text: "OK" }]
      );
      return false;
    }
    if (
      fitnessGoal?.toLowerCase().includes("gain") &&
      targetKg !== null &&
      weightKg >= targetKg
    ) {
      Alert.alert(
        "Weight Conflict",
        "This weight conflicts with your goal. Please go to Adjust Goals to update your plan.",
        [{ text: "OK" }]
      );
      return false;
    }

    Alert.alert(
      "Weight Updated",
      "Updating your weight may affect your daily targets. You can review these in Adjust Goals or Adjust Targets.",
      [
        {
          text: "OK",
          onPress: onSuccess,
        },
      ]
    );
    return true;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#19a28f" />
      </View>
    );
  }

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={["left", "right"]}>
      <Header title="Account Settings" />
      <ScrollView
        contentContainerStyle={{ backgroundColor: "#f8f8f8", flexGrow: 1 }}
      >
        <View className="bg-white rounded-2xl mx-3 px-0 py-0 shadow-sm">
          {/* Email */}
          <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
            <Text className="flex-1 text-base text-[#222]">Email</Text>
            <Text className="text-base text-[#888]">
              {userRef.current?.email || "-"}
            </Text>
          </View>
          {/* First name */}
          <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
            <Text className="flex-1 text-base text-[#222]">First name</Text>
            <TextInput
              ref={(ref) => {
                if (ref) {
                  inputRefs.current.first_name = ref;
                }
              }}
              value={localValues.first_name}
              onChangeText={(v) => handleFieldChange("first_name", v)}
              onFocus={() => setFocusedField("first_name")}
              onBlur={() => handleFieldBlur("first_name")}
              className="text-base text-[#222] text-right flex-1 min-w-[80px]"
              placeholder="First name"
              editable={!updating.first_name}
              underlineColorAndroid="transparent"
            />
            {updating.first_name && (
              <ActivityIndicator
                size="small"
                color="#19a28f"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
          {/* Last name */}
          <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
            <Text className="flex-1 text-base text-[#222]">Last name</Text>
            <TextInput
              ref={(ref) => {
                if (ref) {
                  inputRefs.current.last_name = ref;
                }
              }}
              value={localValues.last_name}
              onChangeText={(v) => handleFieldChange("last_name", v)}
              onFocus={() => setFocusedField("last_name")}
              onBlur={() => handleFieldBlur("last_name")}
              className="text-base text-[#222] text-right flex-1 min-w-[80px]"
              placeholder="Last name"
              editable={!updating.last_name}
              underlineColorAndroid="transparent"
            />
            {updating.last_name && (
              <ActivityIndicator
                size="small"
                color="#19a28f"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
          {/* Birthday */}
          <TouchableOpacity
            className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4"
            onPress={() => {
              Keyboard.dismiss();
              setTempDate(
                userRef.current?.dob
                  ? new Date(userRef.current.dob)
                  : new Date()
              );
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text className="flex-1 text-base text-[#222]">Birthday</Text>
            <Text className="text-base text-[#222]">
              {formatDate(userRef.current?.dob)}
            </Text>
          </TouchableOpacity>
          {/* Gender */}
          <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
            <Text className="flex-1 text-base text-[#222]">Gender</Text>
            <View className="flex-1 items-end">
              <TextInput
                value={
                  userRef.current?.sex === "male"
                    ? "Male"
                    : userRef.current?.sex === "female"
                    ? "Female"
                    : ""
                }
                onFocus={() => {}}
                className="text-base text-[#222] text-right min-w-[60px]"
                placeholder="Gender"
                editable={false}
                pointerEvents="none"
              />
              <View
                className="absolute right-0 top-0 bottom-0 w-full"
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  className="flex-1 w-full h-full"
                  onPress={() => {
                    Keyboard.dismiss();
                    Alert.alert(
                      "Select Gender",
                      undefined,
                      GENDER_OPTIONS.map((opt) => ({
                        text: opt.label,
                        onPress: () => handleFieldChange("sex", opt.value),
                      }))
                    );
                  }}
                />
              </View>
            </View>
            {updating.sex && (
              <ActivityIndicator
                size="small"
                color="#19a28f"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
          {/* Height Unit Switch */}
          <View className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]">
            <Text className="flex-1 text-base text-[#222]">Height Unit</Text>
            <View className="flex-row items-center justify-end">
              <Text
                className={`text-base mr-3 ${
                  height_unit_preference === "imperial"
                    ? "text-black font-semibold"
                    : "font-normal text-gray-500"
                }`}
              >
                ft/in
              </Text>
              <Switch
                value={height_unit_preference === "metric"}
                onValueChange={(v) =>
                  handleHeightUnitChange(v ? "metric" : "imperial")
                }
                trackColor={{ false: "#009688", true: "#009688" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#009688"
              />
              <Text
                className={`text-base ml-3 ${
                  height_unit_preference === "metric"
                    ? "text-black font-semibold"
                    : "font-normal text-gray-500"
                }`}
              >
                cm
              </Text>
            </View>
          </View>
          {/* Height Value */}
          {Platform.OS === "ios" ? (
            <TouchableOpacity
              className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]"
              onPress={() => {
                Keyboard.dismiss();
                setTempHeightCm(heightCm);
                setTempHeightFt(heightFt);
                setTempHeightIn(heightIn);
                setShowHeightPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text className="flex-1 text-base text-[#222]">Height</Text>
              <View className="flex-row items-center">
                <Text className="text-base text-[#222]">
                  {height_unit_preference === "metric"
                    ? heightCm
                      ? `${heightCm} cm`
                      : "-"
                    : heightFt && heightIn !== null
                    ? `${heightFt}' ${heightIn}"`
                    : "-"}
                </Text>
                {updating.height && (
                  <ActivityIndicator
                    size="small"
                    color="#19a28f"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]">
              <Text className="flex-1 text-base text-[#222]">Height</Text>
              <View className="flex-row items-center flex-1 justify-end">
                {height_unit_preference === "metric" ? (
                  <View className="border-b border-gray-100">
                    <Picker
                      selectedValue={heightCm}
                      style={{
                        width: 140,
                        height: 50,
                        color: "black",
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: "#6b7280",
                        borderRadius: 4,
                      }}
                      itemStyle={{ fontSize: 18, color: "white" }}
                      onValueChange={(value) => {
                        setHeightCm(value);
                        // Note: useSyncBodyMetricToBackend hook will automatically sync to backend
                      }}
                      dropdownIconColor="#6b7280"
                    >
                      <Picker.Item
                        label="cm"
                        value={null}
                        style={{ color: "white" }}
                      />
                      {Array.from({ length: 121 }, (_, i) => 100 + i).map(
                        (cm) => (
                          <Picker.Item
                            key={cm}
                            label={`${cm} cm`}
                            style={{ color: "#000000" }}
                            value={cm}
                          />
                        )
                      )}
                    </Picker>
                    <Text
                      style={{
                        width: "100%",
                        height: 60,
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                      }}
                    >
                      {" "}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row gap-4">
                    <View className="border-b border-gray-100">
                      <Picker
                        selectedValue={heightFt}
                        style={{
                          width: 100,
                          height: 50,
                          color: "black",
                          backgroundColor: "transparent",
                          borderWidth: 1,
                          borderColor: "#6b7280",
                          borderRadius: 4,
                        }}
                        itemStyle={{ fontSize: 18, color: "white" }}
                        onValueChange={(value) => {
                          setHeightFt(value);
                          // Note: useSyncBodyMetricToBackend hook will automatically sync to backend
                        }}
                        dropdownIconColor="#6b7280"
                      >
                        <Picker.Item
                          label="ft"
                          value={null}
                          style={{ color: "white" }}
                        />
                        {[3, 4, 5, 6, 7, 8, 9].map((ft) => (
                          <Picker.Item
                            key={ft}
                            label={`${ft} ft`}
                            style={{ color: "#000000" }}
                            value={ft}
                          />
                        ))}
                      </Picker>
                      <Text
                        style={{
                          width: "100%",
                          height: 60,
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                        }}
                      >
                        {" "}
                      </Text>
                    </View>
                    <View className="border-b border-gray-100">
                      <Picker
                        selectedValue={heightIn}
                        style={{
                          width: 100,
                          height: 50,
                          color: "black",
                          backgroundColor: "transparent",
                          borderWidth: 1,
                          borderColor: "#6b7280",
                          borderRadius: 4,
                        }}
                        itemStyle={{ fontSize: 18, color: "white" }}
                        onValueChange={(value) => {
                          setHeightIn(value);
                          // Note: useSyncBodyMetricToBackend hook will automatically sync to backend
                        }}
                        dropdownIconColor="#6b7280"
                      >
                        <Picker.Item
                          label="in"
                          value={null}
                          style={{ color: "white" }}
                        />
                        {Array.from({ length: 12 }, (_, i) => i).map((inc) => (
                          <Picker.Item
                            key={inc}
                            label={`${inc} in`}
                            style={{ color: "#000000" }}
                            value={inc}
                          />
                        ))}
                      </Picker>
                      <Text
                        style={{
                          width: "100%",
                          height: 60,
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                        }}
                      >
                        {" "}
                      </Text>
                    </View>
                  </View>
                )}
                {updating.height && (
                  <ActivityIndicator
                    size="small"
                    color="#19a28f"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </View>
          )}
          {/* Weight Unit Switch */}
          <View className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]">
            <Text className="flex-1 text-base text-[#222]">Weight Unit</Text>
            <View className="flex-row items-center justify-end">
              <Text
                className={`text-base mr-3 ${
                  weight_unit_preference === "imperial"
                    ? "text-black font-semibold"
                    : "font-normal text-gray-500"
                }`}
              >
                lbs
              </Text>
              <Switch
                value={weight_unit_preference === "metric"}
                onValueChange={(v) =>
                  handleWeightUnitChange(v ? "metric" : "imperial")
                }
                trackColor={{ false: "#009688", true: "#009688" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#009688"
              />
              <Text
                className={`text-base ml-3 ${
                  weight_unit_preference === "metric"
                    ? "text-black font-semibold"
                    : "font-normal text-gray-500"
                }`}
              >
                kg
              </Text>
            </View>
          </View>
          {/* Weight Value */}
          {Platform.OS === "ios" ? (
            <TouchableOpacity
              className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]"
              onPress={() => {
                Keyboard.dismiss();
                setTempWeightKg(weightKg);
                setTempWeightLb(weightLb);
                setShowWeightPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text className="flex-1 text-base text-[#222]">Weight</Text>
              <View className="flex-row items-center">
                <Text className="text-base text-[#222]">
                  {weight_unit_preference === "metric"
                    ? weightKg
                      ? `${weightKg} kg`
                      : "-"
                    : weightLb
                    ? `${weightLb} lb`
                    : "-"}
                </Text>
                {updating.weight && (
                  <ActivityIndicator
                    size="small"
                    color="#19a28f"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center min-h-[56px] px-4 border-b border-[#f0f0f0]">
              <Text className="flex-1 text-base text-[#222]">Weight</Text>
              <View className="flex-row items-center flex-1 justify-end">
                {weight_unit_preference === "metric" ? (
                  <View className="border-b border-gray-100">
                    <Picker
                      selectedValue={weightKg}
                      style={{
                        width: 140,
                        height: 50,
                        color: "black",
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: "#6b7280",
                        borderRadius: 4,
                      }}
                      itemStyle={{ fontSize: 18, color: "white" }}
                      onValueChange={(value) => {
                        if (value !== null) {
                          validateWeightChange(value, "kg", () =>
                            setWeightKg(value)
                          );
                        } else {
                          setWeightKg(null);
                        }
                      }}
                      dropdownIconColor="#6b7280"
                    >
                      <Picker.Item
                        label="kg"
                        value={null}
                        style={{ color: "white" }}
                      />
                      {Array.from({ length: 221 }, (_, i) => 30 + i).map(
                        (kg) => (
                          <Picker.Item
                            key={kg}
                            label={`${kg} kg`}
                            style={{ color: "#000000" }}
                            value={kg}
                          />
                        )
                      )}
                    </Picker>
                    <Text
                      style={{
                        width: "100%",
                        height: 60,
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                      }}
                    >
                      {" "}
                    </Text>
                  </View>
                ) : (
                  <View className="border-b border-gray-100">
                    <Picker
                      selectedValue={weightLb}
                      style={{
                        width: 120,
                        height: 50,
                        color: "black",
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: "#6b7280",
                        borderRadius: 4,
                      }}
                      itemStyle={{ fontSize: 18, color: "white" }}
                      onValueChange={(value) => {
                        if (value !== null) {
                          validateWeightChange(value, "lb", () =>
                            setWeightLb(value)
                          );
                        } else {
                          setWeightLb(null);
                        }
                      }}
                      dropdownIconColor="#6b7280"
                    >
                      <Picker.Item
                        label="lb"
                        value={null}
                        style={{ color: "white" }}
                      />
                      {Array.from({ length: 321 }, (_, i) => 80 + i).map(
                        (lb) => (
                          <Picker.Item
                            key={lb}
                            label={`${lb} lb`}
                            style={{ color: "#000000" }}
                            value={lb}
                          />
                        )
                      )}
                    </Picker>
                    <Text
                      style={{
                        width: "100%",
                        height: 60,
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                      }}
                    >
                      {" "}
                    </Text>
                  </View>
                )}
                {updating.weight && (
                  <ActivityIndicator
                    size="small"
                    color="#19a28f"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            </View>
          )}
        </View>
        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                  minWidth: 280,
                }}
              >
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      // Save immediately and close on Android
                      if (selectedDate) {
                        handleFieldChange(
                          "dob",
                          selectedDate.toISOString().split("T")[0]
                        );
                      }
                      setShowDatePicker(false);
                    } else {
                      // On iOS, update tempDate, don't close yet
                      if (selectedDate) setTempDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
                {/* Modal Buttons */}
                {Platform.OS === "ios" && (
                  <View style={{ flexDirection: "row", marginTop: 24 }}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        marginRight: 18,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                      }}
                    >
                      <Text style={{ color: "#888", fontSize: 16 }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (tempDate) {
                          handleFieldChange(
                            "dob",
                            tempDate.toISOString().split("T")[0]
                          );
                        }
                        setShowDatePicker(false);
                      }}
                      style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                    >
                      <Text
                        style={{
                          color: "#19a28f",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Height Picker Modal - iOS Only */}
        {showHeightPicker && Platform.OS === "ios" && (
          <Modal
            visible={showHeightPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowHeightPicker(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                  minWidth: 320,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}
                >
                  Select Height
                </Text>

                {height_unit_preference === "metric" ? (
                  <Picker
                    selectedValue={tempHeightCm}
                    style={{ width: 200, height: 180 }}
                    onValueChange={(value) => setTempHeightCm(value)}
                  >
                    <Picker.Item label="Select cm" value={null} />
                    {Array.from({ length: 121 }, (_, i) => 100 + i).map(
                      (cm) => (
                        <Picker.Item key={cm} label={`${cm} cm`} value={cm} />
                      )
                    )}
                  </Picker>
                ) : (
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ marginBottom: 10, fontWeight: "600" }}>
                        Feet
                      </Text>
                      <Picker
                        selectedValue={tempHeightFt}
                        style={{ width: 100, height: 180 }}
                        onValueChange={(value) => setTempHeightFt(value)}
                      >
                        <Picker.Item label="ft" value={null} />
                        {[3, 4, 5, 6, 7, 8, 9].map((ft) => (
                          <Picker.Item key={ft} label={`${ft}`} value={ft} />
                        ))}
                      </Picker>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ marginBottom: 10, fontWeight: "600" }}>
                        Inches
                      </Text>
                      <Picker
                        selectedValue={tempHeightIn}
                        style={{ width: 100, height: 180 }}
                        onValueChange={(value) => setTempHeightIn(value)}
                      >
                        <Picker.Item label="in" value={null} />
                        {Array.from({ length: 12 }, (_, i) => i).map((inc) => (
                          <Picker.Item key={inc} label={`${inc}`} value={inc} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: "row", marginTop: 24 }}>
                  <TouchableOpacity
                    onPress={() => setShowHeightPicker(false)}
                    style={{
                      marginRight: 18,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (
                        height_unit_preference === "metric" &&
                        tempHeightCm !== null
                      ) {
                        setHeightCm(tempHeightCm);
                        // Note: useSyncBodyMetricToBackend hook will automatically sync to backend
                      } else if (
                        height_unit_preference === "imperial" &&
                        tempHeightFt !== null &&
                        tempHeightIn !== null
                      ) {
                        setHeightFt(tempHeightFt);
                        setHeightIn(tempHeightIn);
                        // Note: useSyncBodyMetricToBackend hook will automatically sync to backend
                      }
                      setShowHeightPicker(false);
                    }}
                    style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                  >
                    <Text
                      style={{
                        color: "#19a28f",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Weight Picker Modal - iOS Only */}
        {showWeightPicker && Platform.OS === "ios" && (
          <Modal
            visible={showWeightPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowWeightPicker(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  padding: 24,
                  alignItems: "center",
                  minWidth: 280,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}
                >
                  Select Weight
                </Text>

                {weight_unit_preference === "metric" ? (
                  <Picker
                    selectedValue={tempWeightKg}
                    style={{ width: 200, height: 180 }}
                    onValueChange={(value) => setTempWeightKg(value)}
                  >
                    <Picker.Item label="Select kg" value={null} />
                    {Array.from({ length: 221 }, (_, i) => 30 + i).map((kg) => (
                      <Picker.Item key={kg} label={`${kg} kg`} value={kg} />
                    ))}
                  </Picker>
                ) : (
                  <Picker
                    selectedValue={tempWeightLb}
                    style={{ width: 200, height: 180 }}
                    onValueChange={(value) => setTempWeightLb(value)}
                  >
                    <Picker.Item label="Select lb" value={null} />
                    {Array.from({ length: 321 }, (_, i) => 80 + i).map((lb) => (
                      <Picker.Item key={lb} label={`${lb} lb`} value={lb} />
                    ))}
                  </Picker>
                )}

                <View style={{ flexDirection: "row", marginTop: 24 }}>
                  <TouchableOpacity
                    onPress={() => setShowWeightPicker(false)}
                    style={{
                      marginRight: 18,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (
                        weight_unit_preference === "metric" &&
                        tempWeightKg !== null
                      ) {
                        validateWeightChange(tempWeightKg, "kg", () => {
                          setWeightKg(tempWeightKg);
                          setShowWeightPicker(false);
                        });
                      } else if (
                        weight_unit_preference === "imperial" &&
                        tempWeightLb !== null
                      ) {
                        validateWeightChange(tempWeightLb, "lb", () => {
                          setWeightLb(tempWeightLb);
                          setShowWeightPicker(false);
                        });
                      } else {
                        setShowWeightPicker(false);
                      }
                    }}
                    style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                  >
                    <Text
                      style={{
                        color: "#19a28f",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <View className="mt-8 mx-4">
          <TouchableOpacity
            className="pl-4 flex-row justify-start bg-white rounded-xl py-6"
            onPress={handleDeleteAccount}
          >
            <Text className="text-punchRed text-left font-semibold text-base">
              Delete account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </CustomSafeAreaView>
  );
}
