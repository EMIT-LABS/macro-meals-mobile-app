import { usePosthog } from '@macro-meals/posthog_service/src';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BackButton from 'src/components/BackButton';
import CustomSafeAreaView from 'src/components/CustomSafeAreaView';
import { LinearProgress } from 'src/components/LinearProgress';
import { AdjustGoalBodyMetricsHeight } from 'src/components/goal_flow_components/basic_info/AdjustGoalBodyMetricsHeight';
import { AdjustGoalBodyMetricsWeight } from 'src/components/goal_flow_components/basic_info/AdjustGoalBodyMetricsWeight';
import { AdjustGoalsDailyActivityLevel } from 'src/components/goal_flow_components/basic_info/AdjustGoalsDailyActivityLevel';
import { AdjustGoalsDietaryPreference } from 'src/components/goal_flow_components/basic_info/AdjustGoalsDietaryPreference';
import { AdjustGoalsFitnessGoal } from 'src/components/goal_flow_components/your_goal/AdjustGoalsFitnessGoal';
import { AdjustGoalsProgressRate } from 'src/components/goal_flow_components/your_goal/AdjustGoalsProgressRate';
import { AdjustGoalsTargetWeight } from 'src/components/goal_flow_components/your_goal/AdjustGoalsTargetWeight';
import { GoalsPersonalizedPlan } from 'src/components/goal_flow_components/your_plan/GoalsPersonalizedPlan';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { MacroSetupRequest, setupMacros } from 'src/services/macroService';
import { userService } from 'src/services/userService';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';
import { RootStackParamList } from 'src/types/navigation';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdjustGoalsFlow'
>;

export const AdjustGoalsFlow = () => {
  const posthog = usePosthog()
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
    dietaryPreference,
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
    setHeightUnitPreference,
    setHeightFt,
    setHeightIn,
    setHeightCm,
  } = useAdjustGoalsFlowStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [macroCalculationResponse, setMacroCalculationResponse] =
    React.useState<any>(null);

  const handleRecalculateMacros = () => {
    // Send the user back to the beginning of the flow (conceptually starting from weight metrics)
    resetToHeightMetrics();
    setSubStep(0, 1);
    setMacroCalculationResponse(null);
  };

  // Disable Android hardware back for this screen; rely on in-flow back/exit logic instead
  React.useEffect(() => {
    const onBackPress = () => {
      // Prevent default back behaviour while in AdjustGoalsFlow
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // On mount, reset flow and start at weight metrics instead of height
  React.useEffect(() => {
    resetToHeightMetrics();
    // Move first basic-info substep from height (0) to weight (1)
    setSubStep(0, 1);
  }, [resetToHeightMetrics, setSubStep]);

  // Helper to map activity level and goal type
  const activityLevelMap: Record<string, string> = {
    'Not very active': 'sedentary',
    'Lightly active': 'sedentary',
    Active: 'moderate',
    'Very active': 'active',
  };
  const goalTypeMap: Record<string, string> = {
    'Lose weight': 'lose',
    'Maintain weight': 'maintain',
    'Gain weight': 'gain',
  };


  useEffect(()=>{
   posthog?.track({
        name: "adjust_targets_screen_viewed",
        properties: {
          platform:Platform.OS,
         goal_type:fitnessGoal

        },
      });
  })

  React.useEffect(() => {
    // Fetch profile data when DOB, gender, or height metrics are missing
    const needsProfile =
      !dateOfBirth ||
      !gender ||
      (height_unit_preference === 'imperial'
        ? heightFt == null || heightIn == null
        : heightCm == null);

    if (!needsProfile) {
      return;
    }

    userService
      .getProfile()
      .then(profile => {
        // The backend typically returns 'dob' and 'sex' fields
        if (profile.dob && !dateOfBirth) {
          setDateOfBirth(profile.dob); // or profile.dateOfBirth if that's the field name
        }
        if (profile.sex && !gender) {
          setGender(profile.sex); // or profile.gender if that's the field name
        }

        // Hydrate height and height unit preference from profile so height is never 0
        if (typeof profile.height === 'number') {
          const unit = profile.height_unit_preference ?? 'metric';
          if (unit === 'imperial') {
            // Profile height is stored as decimal feet – convert to ft/in for the store
            let ft = Math.floor(profile.height);
            let inch = Math.round((profile.height - ft) * 12);
            if (inch >= 12) {
              ft += 1;
              inch = 0;
            }
            setHeightFt(ft);
            setHeightIn(inch);
            setHeightCm(null);
          } else {
            // Metric: height stored directly in cm
            setHeightCm(profile.height);
            setHeightFt(null);
            setHeightIn(null);
          }
          setHeightUnitPreference(unit);
        }
      })
      .catch(err => {
        console.error(
          'Error fetching user profile for DOB, gender, and height:',
          err
        );
      });
  }, [
    dateOfBirth,
    gender,
    height_unit_preference,
    heightFt,
    heightIn,
    heightCm,
    setDateOfBirth,
    setGender,
    setHeightUnitPreference,
    setHeightFt,
    setHeightIn,
    setHeightCm,
  ]);

  function buildMacroSetupRequest(store: any): MacroSetupRequest {
    // Only destructure fields that exist in your store!
    const {
      dailyActivityLevel,
      dateOfBirth,
      dietaryPreference,
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

    // Height value (match GoalsSetupFlow: decimal feet for imperial, cm for metric)
    let height: number = 0;
    if (height_unit_preference === 'imperial') {
      if (heightFt === null || heightIn === null) {
        console.error(
          '[AdjustGoalsFlow] Missing imperial height measurement - need both feet and inches'
        );
      } else {
        height = heightFt + heightIn / 12; // decimal feet
        height = parseFloat(height.toFixed(2)); // round to 2 dp
        console.log('[AdjustGoalsFlow] Height calculation (imperial):', {
          heightFt,
          heightIn,
          calculatedHeightValue: height,
          calculation: `${heightFt} + (${heightIn} / 12) = ${height}`,
        });
      }
    } else {
      if (heightCm === null) {
        console.error('[AdjustGoalsFlow] Missing metric height measurement');
      } else {
        height = heightCm;
        console.log('[AdjustGoalsFlow] Height calculation (metric):', {
          heightCm,
          calculatedHeightValue: height,
          calculation: `Using heightCm directly: ${heightCm}`,
        });
      }
    }

    // Weight value (kg for metric, lb for imperial)
    let weight: number = 0;
    if (weight_unit_preference === 'imperial') {
      weight = weightLb ?? 0;
    } else {
      weight = weightKg ?? 0;
    }
    // Format DOB as YYYY-MM-DD
    const dobApi = (() => {
      if (dateOfBirth && dateOfBirth.includes('/')) {
        const [day, month, year] = dateOfBirth.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateOfBirth;
    })();
    // Calculate age from DOB
    const calculateAge = (dob: string) => {
      // Parse dob in format 'DD/MM/YYYY'
      let birthDate: Date | null = null;
      if (dob && typeof dob === 'string' && dob.includes('/')) {
        const [day, month, year] = dob.split('/').map(Number);
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
      activityLevelMap[dailyActivityLevel] || 'sedentary';

    return {
      activity_level: activityLevelApi,
      age: calculateAge(dateOfBirth),
      dietary_preference: dietaryPreference ?? '',
      dob: dobApi,
      goal_type: goalTypeMap[fitnessGoal] || 'maintain',
      height,
      progress_rate: progressRate,
      sex: sexApi ?? '',
      target_weight: targetWeight ?? 0,
      height_unit_preference: height_unit_preference,
      weight_unit_preference: weight_unit_preference,
      weight,
    };
  }

  // Automatically (re)calculate macros whenever we land on the plan step
  React.useEffect(() => {
    if (majorStep === 2 && subSteps[majorStep] === 0) {
      setIsLoading(true);
      const requestData = buildMacroSetupRequest(
        useAdjustGoalsFlowStore.getState()
      );
      console.log('Macro setup request (adjust goals):', requestData);
      setupMacros(requestData)
        .then(response => {
          setMacroCalculationResponse(response);
          setMacroTargets({
            carbs: response.carbs,
            fat: response.fat,
            protein: response.protein,
            calorie: response.calories,
          });
        })
        .catch(error => {
          console.error('Error in adjust goals macro setup:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [majorStep, subSteps, setMacroTargets]);

  const majorSteps = ['Basic info', 'Your goal', 'Your plan'];
  const subStepCounts = [4, 3, 1];

  const basicInfoSubsteps = [
    <View key="height_metrics" style={{ flex: 1 }}>
      <AdjustGoalBodyMetricsHeight />
    </View>,
    <View key="weight_metrics" style={{ flex: 1 }}>
      <AdjustGoalBodyMetricsWeight />
    </View>,
    <View key="activity" style={{ flex: 1 }}>
      <AdjustGoalsDailyActivityLevel />
    </View>,
    <View key="diet" style={{ flex: 1 }}>
      <AdjustGoalsDietaryPreference />
    </View>,
  ];

  const yourGoalSubsteps = [
    <View key="fitness" style={{ flex: 1 }}>
      <AdjustGoalsFitnessGoal />
    </View>,
    <View key="target" style={{ flex: 1 }}>
      <AdjustGoalsTargetWeight />
    </View>,
    <View key="progress" style={{ flex: 1 }}>
      <AdjustGoalsProgressRate />
    </View>,
  ];

  const macroData = React.useMemo(
    () =>
      macroTargets
        ? [
            { type: 'Carbs', value: macroTargets.carbs, color: '#FFC107' },
            { type: 'Fat', value: macroTargets.fat, color: '#E283E0' },
            { type: 'Protein', value: macroTargets.protein, color: '#A59DFE' },
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

  useEffect(()=>{
    if(weightKg && weightLb){
      posthog.track({
        name:'adjust_goals_weight_selected  ',
        properties:{
          weight:weightLb || weightKg,
          target_weight:targetWeight
        }
      })
    }
  },[weightKg, weightLb])

  // Validation for current substep
  const isCurrentSubStepValid = () => {
    // Basic Info Steps
    if (majorStep === 0 && subSteps[majorStep] === 0) {
      // Height metrics validation
      if (height_unit_preference === 'imperial') {
        return heightFt !== null && heightIn !== null;
      } else {
        return heightCm !== null;
      }
    }
    if (majorStep === 0 && subSteps[majorStep] === 1) {
      // Weight metrics validation
      if (weight_unit_preference === 'imperial') {
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
      return !!dietaryPreference;
    }

    // Your Goal Steps
    if (majorStep === 1 && subSteps[majorStep] === 0) {
      // Fitness goal validation
      return !!fitnessGoal;
    }
    if (majorStep === 1 && subSteps[majorStep] === 1) {
      // Target weight validation
      if (!targetWeight) return false;
      if (fitnessGoal === 'Gain weight') {
        return (
          targetWeight >
          (weight_unit_preference === 'imperial'
            ? (weightLb ?? 0)
            : (weightKg ?? 0))
        );
      }
      if (fitnessGoal === 'Lose weight') {
        return (
          targetWeight <
          (weight_unit_preference === 'imperial'
            ? (weightLb ?? 0)
            : (weightKg ?? 0))
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
        return;
      } else {
        // Final step: go back to profile/settings without an alert
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Settings' } }],
        });
        return;
      }
    }

    // Special case: skip remaining goal substeps when maintaining weight
    if (
      majorStep === 1 &&
      subSteps[majorStep] === 0 &&
      fitnessGoal === 'Maintain weight'
    ) {
      markSubStepComplete(majorStep, subSteps[majorStep]);
      setMajorStep(majorStep + 1);
      setSubStep(majorStep + 1, 0);
      return;
    }

    // Default: advance to next substep within current major step
    setSubStep(majorStep, subSteps[majorStep] + 1);
  };

  const getStepProgress = (idx: number) => {
    if (idx < majorStep) return 100;
    if (idx === majorStep)
      return ((subSteps[majorStep] + 1) / subStepCounts[majorStep]) * 100;
    return 0;
  };

  const handleBack = () => {
    posthog.track({
      name:'adjust_goals_back_clicked',
      properties:{
        current_step:majorStep,
        previou_step:majorStep-1
      }
    })
    console.log('handleBack called with:', {
      majorStep,
      subSteps,
    });
    // In Adjust Goals, the flow now conceptually starts at "Weight metrics"
    // (basic-info substep index 1). Pressing back from either Height (0)
    // or Weight (1) should prompt to exit, not navigate to a previous screen.
    if (majorStep === 0 && (subSteps[0] === 0 || subSteps[0] === 1)) {
      Alert.alert(
        'Exit',
        'Are you sure you want to exit adjusting your goals?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Settings' } }],
              });
            },
          },
        ]
      );
      return;
    }
    const { canGoBack, shouldExitFlow } = handleBackNavigation();
    console.log('should exit flow:', shouldExitFlow);
    if (shouldExitFlow) {
      Alert.alert(
        'Exit',
        'Are you sure you want to exit adjusting your goals?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Settings' } }],
              }),
          },
        ]
      );
      return;
    }
    if (canGoBack) {
      console.log('subSteps[majorStep]:', subSteps[majorStep]);
      if (subSteps[majorStep] === 0) {
        // Navigate to the previous major step
        setMajorStep(majorStep - 1);
        // We're at the first sub-step of a major step (but not the first major step)
        //  navigation.navigate('GoalSetupScreen');
      }
    }
  };

  return (
    <CustomSafeAreaView edges={['left', 'right']}>
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
            {majorStep !== 2 && (
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
            )}
          </View>
        </View>

        {/* Current Step Content (no pager) */}
        <View className="flex-1 bg-white mx-5">
          {substepComponents[majorStep][subSteps[majorStep]]}
        </View>

        {/* Recalculate + Continue Buttons */}
        <View className="absolute bottom-10 left-0 right-0">
          {majorStep === 2 && (
            <TouchableOpacity
              className="mx-4 mb-3 bg-white border border-primary h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3"
              onPress={handleRecalculateMacros}
            >
              <Text className="text-primary text-sm font-semibold">
                Recalculate macros
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            disabled={!isCurrentSubStepValid() || isLoading}
            className={`mx-4 bg-primary ${
              isCurrentSubStepValid() ? 'opacity-100' : 'opacity-50'
            } h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3`}
            onPress={handleContinue}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold">
                {majorStep === majorSteps.length - 1 &&
                subSteps[majorStep] === subStepCounts[majorStep] - 1
                  ? 'Continue'
                  : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </CustomSafeAreaView>
  );
};
