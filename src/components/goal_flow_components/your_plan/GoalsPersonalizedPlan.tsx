import { useMixpanel } from '@macro-meals/mixpanel';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { MacroCircle } from 'src/components/MacroCircle';
import { useGoalsFlowStore } from 'src/store/goalsFlowStore';

type MacroDataItem = {
  type: string;
  value: number | undefined;
  color: string;
};

export const GoalsPersonalizedPlan: React.FC<{
  isLoading: boolean;
  macroData: MacroDataItem[];
  calorieTarget?: number;
  macroCalculationResponse?: any;
}> = ({ isLoading, macroData, calorieTarget, macroCalculationResponse }) => {
  const mixpanel = useMixpanel();

  // Get user input values from the goals flow store
  const {
    dateOfBirth,
    gender,
    height_unit_preference,
    heightFt,
    heightIn,
    heightCm,
    weight_unit_preference,
    weightLb,
    weightKg,
    targetWeight,
  } = useGoalsFlowStore();

  // Helper to calculate age from dateOfBirth (YYYY-MM-DD or DD/MM/YYYY)
  const calculateAge = (dob?: string) => {
    if (!dob) return undefined;
    let year, month, day;
    if (dob.includes('/')) {
      // DD/MM/YYYY
      [day, month, year] = dob.split('/');
    } else {
      // YYYY-MM-DD
      [year, month, day] = dob.split('-');
    }
    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (
      macroData?.some(macro => macro.value !== undefined) ||
      macroCalculationResponse
    ) {
      console.log('MACRO DATA', macroData);
      console.log('MACRO CALCULATION RESPONSE', macroCalculationResponse);

      // Track macro calculation completion in Mixpanel
      if (mixpanel && macroCalculationResponse && !isLoading) {
        // Compose height and weight from store if not in response
        const currentWeight =
          macroCalculationResponse.weight ??
          (weight_unit_preference === 'imperial' ? weightLb : weightKg);
        const height =
          macroCalculationResponse.height ??
          (height_unit_preference === 'imperial'
            ? `${heightFt || 0}'${heightIn || 0}"`
            : heightCm);
        const age =
          macroCalculationResponse.age ??
          calculateAge(dateOfBirth ?? undefined);
        const genderValue =
          macroCalculationResponse.sex?.toLowerCase() ?? gender?.toLowerCase();
        const heightUnitPreference =
          macroCalculationResponse.height_unit_preference ??
          height_unit_preference;
        const weightUnitPreference =
          macroCalculationResponse.weight_unit_preference ??
          weight_unit_preference;
        const targetWeightValue =
          macroCalculationResponse.target_weight ?? targetWeight;

        mixpanel.setUserProperties({
          has_macros: true,
          calorie_target: calorieTarget || macroCalculationResponse.calories,
          protein_target: macroCalculationResponse.protein,
          carbs_target: macroCalculationResponse.carbs,
          fat_target: macroCalculationResponse.fat,
          goal_type: macroCalculationResponse.goal_type,
          height_unit_preference: heightUnitPreference,
          weight_unit_preference: weightUnitPreference,
          estimated_goal_date:
            macroCalculationResponse.time_to_goal?.estimated_date,
          time_to_goal_weeks: macroCalculationResponse.time_to_goal?.weeks,
        });

        // Track macro setup completion with time-to-setup metric
        const trackMacroSetupCompleted = async () => {
          try {
            const signupTime = mixpanel?.getSuperProperty?.('signup_time');
            const now = new Date();
            const timeToMacroSetup = signupTime
              ? (now.getTime() - new Date(signupTime).getTime()) / 1000
              : 0;

            mixpanel.track({
              name: 'macro_setup_completed',
              properties: {
                age,
                gender: genderValue,
                activity_level:
                  macroCalculationResponse.activity_level?.toLowerCase(),
                goal_type: macroCalculationResponse.goal_type?.toLowerCase(),
                time_to_macro_setup_seconds: timeToMacroSetup,
                calorie_target:
                  calorieTarget || macroCalculationResponse.calories,
                protein_target: macroCalculationResponse.protein,
                carbs_target: macroCalculationResponse.carbs,
                fat_target: macroCalculationResponse.fat,
                height_unit_preference: height_unit_preference,
                weight_unit_preference: weight_unit_preference,
                estimated_goal_date:
                  macroCalculationResponse.time_to_goal?.estimated_date,
                time_to_goal_weeks:
                  macroCalculationResponse.time_to_goal?.weeks,
                target_weight: targetWeightValue,
                current_weight: currentWeight,
                height,
                dietary_preference: macroCalculationResponse.dietary_preference,
              },
            });

            console.log('[MIXPANEL] 📊 Macro setup completed and tracked');
          } catch (error) {
            console.error('[MIXPANEL] ❌ Error tracking macro setup:', error);
          }
        };

        trackMacroSetupCompleted();
      }
    }
  }, [
    macroData,
    macroCalculationResponse,
    isLoading,
    mixpanel,
    calorieTarget,
    dateOfBirth,
    gender,
    height_unit_preference,
    heightFt,
    heightIn,
    heightCm,
    weight_unit_preference,
    weightLb,
    weightKg,
    targetWeight,
  ]);

  // Helper function to format the estimated date
  const formatEstimatedDate = (dateString: string) => {
    if (!dateString) return 'your target date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get goal type text
  // const getGoalTypeText = () => {
  //   if (!macroCalculationResponse?.goal_type) return 'achieve your goals';
  //   switch (macroCalculationResponse.goal_type) {
  //     case 'lose':
  //       return 'lose weight';
  //     case 'gain':
  //       return 'gain weight';
  //     case 'maintain':
  //       return 'maintain your weight';
  //     default:
  //       return 'achieve your goals';
  //   }
  // };

  // Get weight change text
  const getWeightChangeText = () => {
    if (
      !macroCalculationResponse?.goal_type ||
      macroCalculationResponse.goal_type === 'maintain'
    ) {
      return 'maintain your current weight';
    }
    // Get current and target weight
    const weightUnitPreference =
      macroCalculationResponse.weight_unit_preference ||
      weight_unit_preference ||
      'kg';
    const currentWeight =
      macroCalculationResponse.weight ??
      (weightUnitPreference === 'imperial' ? weightLb : weightKg);
    const target = macroCalculationResponse.target_weight ?? targetWeight;
    if (!currentWeight || !target) return '';
    const diff = Math.abs(target - currentWeight);
    const formattedDiff = Number(diff).toFixed(2);
    const unitLabel = weightUnitPreference === 'imperial' ? 'lbs' : 'kg';
    if (macroCalculationResponse.goal_type === 'lose') {
      return `lose ${formattedDiff} ${unitLabel}`;
    } else if (macroCalculationResponse.goal_type === 'gain') {
      return `gain ${formattedDiff} ${unitLabel}`;
    }
    return '';
  };

  return (
    <View className="flex-1 bg-white pt-2">
      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-white px-4 pt-2">
          <ActivityIndicator size="large" color="#19a28f" />
          <Text className="text-base text-gray-500 mt-4 text-center">
            Calculating your personalized macro targets...
          </Text>
        </View>
      ) : (
        <View>
          <Text className="text-3xl font-bold mt-2 mb-2">
            Your personalized plan
          </Text>
          <Text className="text-base text-gray-500 mb-6">
            Based on your information, we've calculated your ideal daily
            macronutrient targets to help you reach your goals
          </Text>
          {/* Calorie Target */}
          {((calorieTarget !== undefined && calorieTarget !== 0) ||
            (macroCalculationResponse &&
              macroCalculationResponse.calories)) && (
            <Text className="text-lg font-bold mb-2 text-primary">
              Daily Calories:{' '}
              {calorieTarget && calorieTarget !== 0
                ? calorieTarget
                : macroCalculationResponse?.calories}{' '}
              kcal
            </Text>
          )}
          {/* Macro Targets */}
          <Text className="text-lg font-semibold mb-8">
            Daily macro targets:
          </Text>
          <View className="flex-row items-center mx-6 justify-between mb-6">
            {macroData.map((macro: MacroDataItem) => (
              <MacroCircle
                size={100}
                key={macro.type}
                type={macro.type}
                value={macro.value ?? 0}
                progress={100}
                strokeWidth={3}
                color={macro.color}
              />
            ))}
          </View>
          {/* Info Text */}
          {macroCalculationResponse &&
            (macroCalculationResponse.goal_type === 'maintain' ? (
              <Text className="text-base text-gray-500 mb-2 leading-6 tracking-widest">
                Following this nutrition plan, you’ll stay on track and maintain
                your current weight with ease.
              </Text>
            ) : (
              <Text className="text-base text-gray-500 mb-2 leading-6 tracking-widest">
                These targets are specifically designed to support your fitness
                journey. Following this nutrition plan, you will{' '}
                <Text className="text-primary font-semibold">
                  {getWeightChangeText()}
                </Text>{' '}
                by{' '}
                <Text className="text-primary font-semibold">
                  {formatEstimatedDate(
                    macroCalculationResponse?.time_to_goal?.estimated_date
                  )}
                </Text>
                .
              </Text>
            ))}
          <Text className="text-base text-gray-500 mb-8 mt-4 leading-6 tracking-widest">
            Ready to start tracking your personalized plan?
          </Text>
        </View>
      )}
    </View>
  );
};
