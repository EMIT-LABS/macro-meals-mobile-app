import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "src/components/BackButton";
import CustomPagerView from "src/components/CustomPagerView";
import CustomSafeAreaView from "src/components/CustomSafeAreaView";
import { LinearProgress } from "src/components/LinearProgress";
import { GoalBodyMetricsHeight } from "src/components/goal_flow_components/basic_info/GoalBodyMetricsHeight";
import { GoalBodyMetricsWeight } from "src/components/goal_flow_components/basic_info/GoalsBodyMetricsWeight";
import { GoalDailyActivityLevel } from "src/components/goal_flow_components/basic_info/GoalsDailyActivityLevel";
import { GoalsDietryPreference } from "src/components/goal_flow_components/basic_info/GoalsDietryPreference";
import { GoalsFitnessGoal } from "src/components/goal_flow_components/your_goal/GoalsFitnessGoal";
import { GoalsProgressRate } from "src/components/goal_flow_components/your_goal/GoalsProgressRate";
import { GoalsTargetWeight } from "src/components/goal_flow_components/your_goal/GoalsTargetWeight";
import { GoalsPersonalizedPlan } from "src/components/goal_flow_components/your_plan/GoalsPersonalizedPlan";
import { IMAGE_CONSTANTS } from "src/constants/imageConstants";
import { MacroSetupRequest, setupMacros } from "src/services/macroService";
import { userService } from "src/services/userService";
import { useGoalsFlowStore } from "src/store/goalsFlowStore";
import { RootStackParamList } from "src/types/navigation";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AdjustGoalsFlow"
>;

export const AdjustGoalsFlow = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    majorStep,
    setMajorStep,
    subSteps,
    setSubStep,
    markSubStepComplete,
    handleBackNavigation,
    height_unit_preference,
    weight_unit_preference,
    heightFt,
    heightIn,
    heightCm,
    weightLb,
    weightKg,
    dailyActivityLevel,
    dietryPreference,
    fitnessGoal,
    targetWeight,
    progressRate,
    preferences,
    macroTargets,
    setMacroTargets,
    resetToHeightMetrics,
    gender,
    dateOfBirth,
    setDateOfBirth,
    setGender,
  } = useGoalsFlowStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [macroCalculationResponse, setMacroCalculationResponse] =
    React.useState<any>(null);

  // Always start at height metrics when this component mounts
  React.useEffect(() => {
    resetToHeightMetrics();
  }, []);

  // Helper to map activity level and goal type
  const activityLevelMap: Record<string, string> = {
    "Not very active": "sedentary",
    "Lightly active": "sedentary",
    Active: "moderate",
    "Very active": "active",
  };
  const goalTypeMap: Record<string, string> = {
    "Lose weight": "lose",
    "Maintain weight": "maintain",
    "Gain weight": "gain",
  };

  React.useEffect(() => {
    // Always fetch gender and dateOfBirth from backend if missing in store
    if (!dateOfBirth || !gender) {
      userService
        .getProfile()
        .then((profile) => {
          // The backend typically returns 'dob' and 'sex' fields
          if (profile.dob) setDateOfBirth(profile.dob); // or profile.dateOfBirth if that's the field name
          if (profile.sex) setGender(profile.sex); // or profile.gender if that's the field name
        })
        .catch((err) => {
          console.error("Error fetching user profile for DOB and gender:", err);
        });
    }
  }, [dateOfBirth, gender]);

  function buildMacroSetupRequest(store: any): MacroSetupRequest {
    // Only destructure fields that exist in your store!
    const {
      dailyActivityLevel,
      dateOfBirth,
      dietryPreference,
      fitnessGoal,
      height_unit_preference,
      heightFt,
      heightIn,
      heightCm,
      progressRate,
      gender,
      targetWeight,
      weight_unit_preference,
      weightLb,
      weightKg,
    } = store;

    // Height value (cm for metric, feet+inches for imperial)
    let height: number = 0;
    if (height_unit_preference === "imperial") {
      // Convert feet/inches to inches, then to cm if needed
      height = (heightFt ?? 0) * 12 + (heightIn ?? 0);
    } else {
      height = heightCm ?? 0;
    }

    // Weight value (kg for metric, lb for imperial)
    let weight: number = 0;
    if (weight_unit_preference === "imperial") {
      weight = weightLb ?? 0;
    } else {
      weight = weightKg ?? 0;
    }
    // Format DOB as YYYY-MM-DD
    const dobApi = (() => {
      if (dateOfBirth && dateOfBirth.includes("/")) {
        const [day, month, year] = dateOfBirth.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      return dateOfBirth;
    })();
    // Calculate age from DOB
    const calculateAge = (dob: string) => {
      // Parse dob in format 'DD/MM/YYYY'
      let birthDate: Date | null = null;
      if (dob && typeof dob === "string" && dob.includes("/")) {
        const [day, month, year] = dob.split("/").map(Number);
        birthDate = new Date(year, month - 1, day);
      } else {
        birthDate = new Date(dob);
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    };

    const sexApi = gender?.toLowerCase();
    const activityLevelApi =
      activityLevelMap[dailyActivityLevel] || "sedentary";

    return {
      activity_level: activityLevelApi,
      age: calculateAge(dateOfBirth),
      dietary_preference: dietryPreference ?? "",
      dob: dobApi,
      goal_type: goalTypeMap[fitnessGoal] || "maintain",
      height,
      progress_rate: progressRate,
      sex: sexApi ?? "",
      target_weight: targetWeight ?? 0,
      height_unit_preference: height_unit_preference,
      weight_unit_preference: weight_unit_preference,
      weight,
    };
  }

  // Replace your macro calculation useEffect with this:
  React.useEffect(() => {
    if (majorStep === 2 && subSteps[majorStep] === 0) {
      if (!macroTargets || !macroCalculationResponse) {
        setIsLoading(true);
        const requestData = buildMacroSetupRequest(
          useGoalsFlowStore.getState()
        );
        console.log("Macro setup request:", requestData);
        setupMacros(requestData)
          .then((response) => {
            setMacroCalculationResponse(response);
            setMacroTargets({
              carbs: response.carbs,
              fat: response.fat,
              protein: response.protein,
              calorie: response.calories,
            });
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      }
    }
  }, [
    majorStep,
    subSteps,
    macroTargets,
    macroCalculationResponse,
    setMacroTargets,
  ]);

  const majorSteps = ["Basic info", "Your goal", "Your plan"];
  const subStepCounts = [4, 3, 1];

  const basicInfoSubsteps = [
    <GoalBodyMetricsHeight key="height_metrics" />,
    <GoalBodyMetricsWeight key="weight_metrics" />,
    <GoalDailyActivityLevel key="activity" />,
    <GoalsDietryPreference key="diet" />,
  ];

  const yourGoalSubsteps = [
    <GoalsFitnessGoal key="fitness" />,
    <GoalsTargetWeight key="target" />,
    <GoalsProgressRate key="progress" />,
  ];

  const macroData = React.useMemo(
    () =>
      macroTargets
        ? [
            { type: "Carbs", value: macroTargets.carbs, color: "#FFC107" },
            { type: "Fat", value: macroTargets.fat, color: "#E283E0" },
            { type: "Protein", value: macroTargets.protein, color: "#A59DFE" },
          ]
        : [],
    [macroTargets]
  );

  const yourPlanSubsteps = React.useMemo(
    () => [
      <GoalsPersonalizedPlan
        isLoading={isLoading}
        key="plan"
        macroData={macroData}
        calorieTarget={preferences?.calorie_target}
        macroCalculationResponse={macroCalculationResponse}
      />,
    ],
    [
      isLoading,
      macroData,
      preferences?.calorie_target,
      macroCalculationResponse,
    ]
  );

  const substepComponents = [
    basicInfoSubsteps,
    yourGoalSubsteps,
    yourPlanSubsteps,
  ];

  // Validation for current substep
  const isCurrentSubStepValid = () => {
    // Basic Info Steps
    if (majorStep === 0 && subSteps[majorStep] === 0) {
      // Height metrics validation
      if (height_unit_preference === "imperial") {
        return heightFt !== null && heightIn !== null;
      } else {
        return heightCm !== null;
      }
    }
    if (majorStep === 0 && subSteps[majorStep] === 1) {
      // Weight metrics validation
      if (weight_unit_preference === "imperial") {
        return weightLb !== null;
      } else {
        return weightKg !== null;
      }
    }
    if (majorStep === 0 && subSteps[majorStep] === 2) {
      // Daily activity level validation
      return !!dailyActivityLevel;
    }
    if (majorStep === 0 && subSteps[majorStep] === 3) {
      // Dietary preference validation
      console.log("Dietry preference value:", dietryPreference);
      return !!dietryPreference;
    }

    // Your Goal Steps
    if (majorStep === 1 && subSteps[majorStep] === 0) {
      // Fitness goal validation
      return !!fitnessGoal;
    }
    if (majorStep === 1 && subSteps[majorStep] === 1) {
      // Target weight validation
      if (!targetWeight) return false;
      if (fitnessGoal === "Gain weight") {
        return (
          targetWeight >
          (weight_unit_preference === "imperial"
            ? weightLb ?? 0
            : weightKg ?? 0)
        );
      }
      if (fitnessGoal === "Lose weight") {
        return (
          targetWeight <
          (weight_unit_preference === "imperial"
            ? weightLb ?? 0
            : weightKg ?? 0)
        );
      }
      return true;
    }
    if (majorStep === 1 && subSteps[majorStep] === 2) {
      // Progress rate validation
      return progressRate !== 0;
    }

    // Your Plan Steps
    if (majorStep === 2 && subSteps[majorStep] === 0) {
      // Macro targets validation
      return !!macroTargets;
    }

    // Default: allow continue
    return true;
  };

  const handleContinue = async () => {
    if (!isCurrentSubStepValid()) return;
    markSubStepComplete(majorStep, subSteps[majorStep]);

    // If on last substep of current major step
    if (subSteps[majorStep] === subStepCounts[majorStep] - 1) {
      if (majorStep < majorSteps.length - 1) {
        // Move to next major step
        setMajorStep(majorStep + 1);
        setSubStep(majorStep + 1, 0);
        // Optionally, update majorStep in your store if needed
        // setMajorStep(majorStep + 1);
        return;
      } else {
        // Final step: show alert and go back to profile/settings
        Alert.alert("Success", "Your goals have been updated!", [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "SettingsScreen" }],
              });
            },
          },
        ]);
        return;
      }
    }

    if (
      majorStep === 1 &&
      subSteps[majorStep] === 0 &&
      fitnessGoal === "Maintain weight"
    ) {
      markSubStepComplete(majorStep, subSteps[majorStep]);
      setMajorStep(majorStep + 1);
      setSubStep(majorStep + 1, 0);
      return;
    } else {
      setSubStep(majorStep, subSteps[majorStep] + 1);
    }
  };

  const getStepProgress = (idx: number) => {
    if (idx < majorStep) return 100;
    if (idx === majorStep)
      return ((subSteps[majorStep] + 1) / subStepCounts[majorStep]) * 100;
    return 0;
  };

  const handleBack = () => {
    console.log("handleBack called with:", {
      majorStep,
      subSteps,
    });
    if (majorStep === 0 && subSteps[0] === 0) {
      Alert.alert(
        "Exit",
        "Are you sure you want to exit adjusting your goals?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "SettingsScreen" }],
              });
            },
          },
        ]
      );
      return;
    }
    const { canGoBack, shouldExitFlow } = handleBackNavigation();
    console.log("should exit flow:", shouldExitFlow);
    if (shouldExitFlow) {
      Alert.alert(
        "Exit",
        "Are you sure you want to exit adjusting your goals?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            onPress: () => navigation.navigate("SettingsScreen"),
          },
        ]
      );
      return;
    }
    if (canGoBack) {
      console.log("subSteps[majorStep]:", subSteps[majorStep]);
      if (subSteps[majorStep] === 0) {
        // Navigate to the previous major step
        setMajorStep(majorStep - 1);
        // We're at the first sub-step of a major step (but not the first major step)
        //  navigation.navigate('GoalSetupScreen');
      }
    }
  };

  return (
    <CustomSafeAreaView edges={["left", "right"]}>
      <View className="flex-1">
        {/* Header and Segmented Progress Bar */}
        <View className="px-4">
          <View className="flex-row items-center justify-between">
            <View style={{ width: 32 }} /> {/* Spacer */}
          </View>
          <View className="items-center mt-2 mb-2">
            <View className="bg-aquaSqueeze rounded-full px-5 py-2 flex-row items-center justify-center mb-2">
              <Image
                source={IMAGE_CONSTANTS.personAltIcon}
                className="w-[16px] h-[16px] mr-2"
              />
              <Text className="text-base font-normal text-primary">
                {majorSteps[majorStep]}
              </Text>
            </View>
            <View className="flex-row items-center justify-between space-x-2 mt-2 w-full">
              <BackButton onPress={handleBack} />
              <View className="ml-5 flex-row items-start justify-start gap-3 w-full">
                {majorSteps.map((label, idx) => (
                  <View key={label}>
                    <LinearProgress
                      width={81.5}
                      height={6}
                      progress={getStepProgress(idx)}
                      color="#FEBF00"
                      backgroundColor="#E5E5E5"
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Pager */}
        <CustomPagerView
          page={subSteps[majorStep]}
          scrollEnabled={false}
          showIndicator={false}
        >
          {substepComponents[majorStep]}
        </CustomPagerView>

        {/* Continue Button */}
        <View className="absolute bottom-10 left-0 right-0">
          <TouchableOpacity
            disabled={!isCurrentSubStepValid() || isLoading}
            className={`mx-4 bg-primary ${
              isCurrentSubStepValid() ? "opacity-100" : "opacity-50"
            } h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3`}
            onPress={handleContinue}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold">
                {majorStep === majorSteps.length - 1 &&
                subSteps[majorStep] === subStepCounts[majorStep] - 1
                  ? "Confirm"
                  : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </CustomSafeAreaView>
  );
};
