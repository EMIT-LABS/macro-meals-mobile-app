import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BackButton from 'src/components/BackButton';
import CustomPagerView from 'src/components/CustomPagerView';
import CustomSafeAreaView from 'src/components/CustomSafeAreaView';
import { LinearProgress } from 'src/components/LinearProgress';
import { GoalsDateOfBirth } from 'src/components/goal_flow_components/basic_info/GoalsDateOfBirth';
import GoalsGender from 'src/components/goal_flow_components/basic_info/GoalsGender';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useGoalsFlowStore } from 'src/store/goalsFlowStore';
import useStore from 'src/store/useStore';
import { RootStackParamList } from 'src/types/navigation';
// import { GoalsLocation } from 'src/components/goal_flow_components/basic_info/GoalsLocation'
import { GoalBodyMetricsHeight } from 'src/components/goal_flow_components/basic_info/GoalBodyMetricsHeight';
import { GoalBodyMetricsWeight } from 'src/components/goal_flow_components/basic_info/GoalsBodyMetricsWeight';
import { GoalDailyActivityLevel } from 'src/components/goal_flow_components/basic_info/GoalsDailyActivityLevel';
import { GoalsDietaryPreference } from 'src/components/goal_flow_components/basic_info/GoalsDietaryPreference';
import { GoalsFitnessGoal } from 'src/components/goal_flow_components/your_goal/GoalsFitnessGoal';
import { GoalsProgressRate } from 'src/components/goal_flow_components/your_goal/GoalsProgressRate';
import { GoalsTargetWeight } from 'src/components/goal_flow_components/your_goal/GoalsTargetWeight';
import { GoalsPersonalizedPlan } from 'src/components/goal_flow_components/your_plan/GoalsPersonalizedPlan';
import { setupMacros } from 'src/services/macroService';
import { userService } from 'src/services/userService';
import { HasMacrosContext } from '../contexts/HasMacrosContext';
import { usePosthog } from '@macro-meals/posthog_service/src';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GoalsSetupFlow'
>;

type GoalsSetupFlowRouteParams = {
  startFrom?: string;
};

export const GoalsSetupFlow = () => {
  const posthog = usePosthog()
  const navigation = useNavigation<NavigationProp>();
  const {
    majorStep,
    subSteps,
    setSubStep,
    markSubStepComplete,
    handleBackNavigation,
    gender,
    dateOfBirth,
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
    setPreferences,
    macroTargets,
    setMacroTargets,
    resetToHeightMetrics,
  } = useGoalsFlowStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [macroCalculationResponse, setMacroCalculationResponse] =
    React.useState<any>(null);
  const token = useStore(state => state.token);
  const { setHasMacros, setReadyForDashboard } = useContext(HasMacrosContext);
  const [hasStartedCalculation, setHasStartedCalculation] =
    React.useState(false);

  const route = useRoute();
  const { startFrom } = (route.params as GoalsSetupFlowRouteParams) || {};

  const majorSteps = ['Basic info', 'Your goal', 'Your plan'];
  const subStepCounts = [6, 3, 1];
  const isLastStepOfSecondMajor =
    majorStep === 2 && subSteps[majorStep] === subStepCounts[majorStep] - 1;

  React.useEffect(() => {
    if (startFrom === 'height_metrics') {
      resetToHeightMetrics();
    }
  }, [startFrom]);

  React.useEffect(() => {
    if (isLastStepOfSecondMajor && !hasStartedCalculation) {
      const fetchDataAndCalculateMacros = async () => {
        setHasStartedCalculation(true);
        setIsLoading(true);
        try {
          // Validate token first
          if (!token) {
            console.error('No auth token available');
            Alert.alert('Error', 'Please log in again');
            return;
          }

          console.log(
            'Starting preferences fetch with token:',
            token.substring(0, 10) + '...'
          );

          // Fetch preferences first
          const data = await userService.getPreferences();
          console.log('Preferences fetched successfully:', data);

          if (data.detail === 'Not Found') {
            console.error('Preferences not found');
            // Continue with macro calculation even if preferences aren't found
          } else {
            setPreferences(data);
            // Map API response to macroTargets
            setMacroTargets({
              carbs: data.carbs_target,
              fat: data.fat_target,
              protein: data.protein_target,
              calorie: data.calorie_target,
            });
          }

          // Then calculate macros
          console.log('Starting macro calculation...');
          await calculateMacros();
        } catch (error: any) {
          console.error('Error in fetchDataAndCalculateMacros:', error);
          console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
          if (!error.message?.includes('Failed to calculate macros')) {
            Alert.alert('Error', 'Failed to fetch your preferences');
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchDataAndCalculateMacros();
    }
  }, [isLastStepOfSecondMajor, token]);

  const calculateMacros = async () => {
    try {
      if (!token) {
        throw new Error('No auth token available');
      }

      // Validate required fields
      console.log('Validating fields for macro calculation with:', {
        dateOfBirth,
        gender,
        dailyActivityLevel,
        dietaryPreference,
        fitnessGoal,
        targetWeight,
        progressRate,
        height_unit_preference,
        weight_unit_preference,
        heightFt,
        heightIn,
        heightCm,
        weightLb,
        weightKg,
      });

      if (
        !dateOfBirth ||
        !gender ||
        !dailyActivityLevel ||
        !dietaryPreference ||
        !fitnessGoal ||
        !targetWeight ||
        progressRate === undefined ||
        progressRate === null
      ) {
        console.error('Missing required fields:', {
          dateOfBirth: !!dateOfBirth,
          gender: !!gender,
          dailyActivityLevel: !!dailyActivityLevel,
          dietaryPreference: !!dietaryPreference,
          fitnessGoal: !!fitnessGoal,
          targetWeight: !!targetWeight,
          progressRate: !!progressRate,
        });
        throw new Error('Missing required fields');
      }

      // Calculate height (convert feet + inches to decimal feet for imperial)
      let heightValue = 0;
      if (height_unit_preference === 'imperial') {
        if (heightFt === null || heightIn === null) {
          console.error(
            'Missing imperial height measurement - need both feet and inches'
          );
          throw new Error('Missing height measurement');
        }
        heightValue = heightFt + heightIn / 12; // Convert to decimal feet
        heightValue = parseFloat(heightValue.toFixed(2)); // Round to 2 decimal places
        console.log('[GoalsFlow] Height calculation (imperial):', {
          heightFt,
          heightIn,
          calculatedHeightValue: heightValue,
          calculation: `${heightFt} + (${heightIn} / 12) = ${heightValue}`,
        });
      } else {
        if (heightCm === null) {
          console.error('Missing metric height measurement');
          throw new Error('Missing height measurement');
        }
        heightValue = heightCm;
        console.log('[GoalsFlow] Height calculation (metric):', {
          heightCm,
          calculatedHeightValue: heightValue,
          calculation: `Using heightCm directly: ${heightCm}`,
        });
      }

      // Calculate weight (pass as is for both units)
      let weightValue = 0;
      if (weight_unit_preference === 'imperial') {
        if (weightLb === null) {
          console.error('Missing imperial weight measurement');
          throw new Error('Missing weight measurement');
        }
        weightValue = weightLb;
        console.log('[GoalsFlow] Weight calculation (imperial):', {
          weightLb,
          calculatedWeightValue: weightValue,
          calculation: `Using weightLb directly: ${weightLb}`,
        });
      } else {
        if (weightKg === null) {
          console.error('Missing metric weight measurement');
          throw new Error('Missing weight measurement');
        }
        weightValue = weightKg;
        console.log('[GoalsFlow] Weight calculation (metric):', {
          weightKg,
          calculatedWeightValue: weightValue,
          calculation: `Using weightKg directly: ${weightKg}`,
        });
      }

      // Map and format API fields
      const sexApi = gender?.toLowerCase(); // "male" or "female"
      const dobApi = (() => {
        if (dateOfBirth && dateOfBirth.includes('/')) {
          const [day, month, year] = dateOfBirth.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return dateOfBirth;
      })();

      const activityLevelMap: Record<string, string> = {
        'Not very active': 'sedentary',
        'Lightly active': 'sedentary',
        Active: 'moderate',
        'Very active': 'active',
      };
      const activityLevelApi =
        activityLevelMap[dailyActivityLevel] || 'sedentary';

      const goalTypeMap: Record<string, string> = {
        'Lose weight': 'lose',
        'Maintain weight': 'maintain',
        'Gain weight': 'gain',
      };
      const goalTypeApi = goalTypeMap[fitnessGoal] || 'maintain';

      const requestData = {
        activity_level: activityLevelApi,
        age: calculateAge(dateOfBirth),
        dietary_preference: dietaryPreference,
        dob: dobApi,
        goal_type: goalTypeApi,
        height: heightValue,
        progress_rate: progressRate,
        sex: sexApi,
        target_weight: targetWeight,
        height_unit_preference: height_unit_preference, // Use height_unit_preference
        weight_unit_preference: weight_unit_preference, // Use weight_unit_preference
        weight: weightValue,
      };

      console.log(
        'Making macro calculation API request with data:',
        requestData
      );

      const responseData = await setupMacros(requestData);
      console.log('Macro calculation successful, response:', responseData);
      setMacroCalculationResponse(responseData);

      // Update macro targets with the response data
      setMacroTargets({
        carbs: responseData.carbs,
        fat: responseData.fat,
        protein: responseData.protein,
        calorie: responseData.calories,
      });

      // Set hasMacros to true after successful calculation
      setHasMacros(true);
    } catch (error: any) {
      console.error('Error in calculateMacros:', error);
      if (!error.message?.includes('No auth token')) {
        Alert.alert(
          'Error',
          'Failed to calculate your macros. Please try again.'
        );
      }
      throw error;
    }
  };

  // Add a function to handle going to dashboard
  const _handleGoToDashboard = () => {
    setReadyForDashboard(true);
  };

  const basicInfoSubsteps = [
    <GoalsGender key="gender" />,
    <GoalsDateOfBirth key="dob" />,
    <GoalBodyMetricsHeight key="height_metrics" />,
    <GoalBodyMetricsWeight key="weight_metrics" />,
    <GoalDailyActivityLevel key="activity" />,
    <GoalsDietaryPreference key="diet" />,
  ];

  const yourGoalSubsteps = [
    <GoalsFitnessGoal key="fitness" />,
    <GoalsTargetWeight key="target" />,
    <GoalsProgressRate key="progress" />,
  ];

  // Macro data for GoalsPersonalizedPlan
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

    useEffect(() => {
        if (gender) {
            posthog?.track({
                name: 'gender_selected',
                properties: {
                    platform: Platform.OS,
                },
            });
        }

        if (dateOfBirth) {
            posthog?.track({
                name: 'age_selected',
                properties: {
                    platform: Platform.OS,
                },
            });
        }

        if (heightCm || heightFt || heightIn) {
            posthog?.track({
                name: 'height_selected',
                properties: {
                    platform: Platform.OS,
                },
            });
        }
         if (weightKg || weightLb) {
            posthog?.track({
                name: 'weight_selected',
                properties: {
                    platform: Platform.OS,
                },
            });
        }

          if (dailyActivityLevel) {
            posthog?.track({
                name: 'activity_level_selceted',
                properties: {
                    platform: Platform.OS,
                },
            });
        }
         if (dietaryPreference) {
            posthog?.track({
                name: 'dietary_preference_selceted',
                properties: {
                    platform: Platform.OS,
                },
            });
        }
       
     
        
      
    }, [gender, dateOfBirth, heightCm, heightFt, heightIn, weightKg, weightLb, dailyActivityLevel, dietaryPreference, ]);

     

  // Validation for current substep
  const isCurrentSubStepValid = () => {
    if (majorStep === 0 && subSteps[majorStep] === 0) {
      return !!gender;
     
    }
    if (majorStep === 0 && subSteps[majorStep] === 1) {
      return !!dateOfBirth;
    }
    // if (majorStep === 0 && subSteps[majorStep] === 2) {
    //   return !!location;
    // }
    if (majorStep === 0 && subSteps[majorStep] === 2) {
      if (height_unit_preference === 'imperial') {
        return heightFt !== null && heightIn !== null;
      } else {
        return heightCm !== null;
      }
    }
    if (majorStep === 0 && subSteps[majorStep] === 3) {
      if (weight_unit_preference === 'imperial') {
        return weightLb !== null;
      } else {
        return weightKg !== null;
      }
    }
    if (majorStep === 0 && subSteps[majorStep] === 4) {
      return !!dailyActivityLevel;
    }
    if (majorStep === 0 && subSteps[majorStep] === 5) {
      return !!dietaryPreference;
    }
    if (majorStep === 1 && subSteps[majorStep] === 0) {
      return !!fitnessGoal;
    }
    if (majorStep === 1 && subSteps[majorStep] === 1) {
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
      if (progressRate === 0) {
        return false;
      }
      return true;
    }
    if (majorStep === 2 && subSteps[majorStep] === 0) {
      return !!macroTargets;
    }
    // Add more validation for other substeps
    return true;
  };

  const handleContinue = async () => {
    console.log('handleContinue called with:', {
      majorStep,
      subSteps,
      isCurrentSubStepValid: isCurrentSubStepValid(),
      macroTargets,
      fitnessGoal,
      targetWeight,
      progressRate,
      height_unit_preference,
      weight_unit_preference,
      weightKg,
      weightLb,
      heightCm,
      heightFt,
      heightIn,
      dailyActivityLevel,
      dietaryPreference,
      gender,
      dateOfBirth,
    });

    if (!isCurrentSubStepValid()) return;

    // Check if we're on the last step of the second major step
    const isLastStepOfSecondMajor =
      majorStep === 2 && subSteps[majorStep] === subStepCounts[majorStep] - 1;
    console.log('Is last step of second major:', isLastStepOfSecondMajor);

    if (isLastStepOfSecondMajor) {
      console.log('Marking substep complete and navigating to GoalSetupScreen');
      markSubStepComplete(majorStep, subSteps[majorStep]);
      navigation.navigate('GoalSetupScreen');
      return;
    }

    // If on fitness goal step and "Maintain weight" is selected, skip to next major step
    if (
      majorStep === 1 &&
      subSteps[majorStep] === 0 &&
      fitnessGoal === 'Maintain weight'
    ) {
      markSubStepComplete(majorStep, subSteps[majorStep]);
      navigation.navigate('GoalSetupScreen');
      return;
    }

    // Gender substep
    if (majorStep === 0 && subSteps[majorStep] === 0) {
      if (!gender) return;
    }

    // Date of birth substep
    if (majorStep === 0 && subSteps[majorStep] === 1) {
      if (!dateOfBirth) return;
    }

    // Location substep
    // if (majorStep === 0 && subSteps[majorStep] === 2) {
    //   if (!location) return;
    // }

    // Height metrics substep
    if (majorStep === 0 && subSteps[majorStep] === 2) {
      if (height_unit_preference === 'imperial') {
        if (heightFt === null || heightIn === null) return;
      } else {
        if (heightCm === null) return;
      }
    }

    // Weight metrics substep
    if (majorStep === 0 && subSteps[majorStep] === 3) {
      if (weight_unit_preference === 'imperial') {
        if (weightLb === null) return;
      } else {
        if (weightKg === null) return;
      }
    }

    // Daily Activity Level substep
    if (majorStep === 0 && subSteps[majorStep] === 4) {
      if (!dailyActivityLevel) return;
    }

    // Dietary Preference substep (last Basic Info substep)
    if (majorStep === 0 && subSteps[majorStep] === 5) {
      if (!dietaryPreference) return;
      markSubStepComplete(majorStep, subSteps[majorStep]);
      navigation.navigate('GoalSetupScreen');
      return;
    }

    if (majorStep === 1 && subSteps[majorStep] === 0) {
      if (!fitnessGoal) return;
    }

    if (majorStep === 1 && subSteps[majorStep] === 1) {
      if (!targetWeight) return;
    }

    if (majorStep === 1 && subSteps[majorStep] === 2) {
      if (!progressRate) return;
    }

    markSubStepComplete(majorStep, subSteps[majorStep]);
    if (subSteps[majorStep] === subStepCounts[majorStep] - 1) {
      // Last substep of current major step
      navigation.navigate('GoalSetupScreen');
      return;
    }
    setSubStep(majorStep, subSteps[majorStep] + 1);
  };

  // Helper function to calculate age from date of birth
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

  // Calculate progress for each major step
  const getStepProgress = (idx: number) => {
    if (idx < majorStep) return 100;
    if (idx === majorStep)
      return ((subSteps[majorStep] + 1) / subStepCounts[majorStep]) * 100;
    return 0;
  };

  const handleBack = () => {
    if (
      majorStep === 0 &&
      subSteps[0] === 2 &&
      startFrom === 'height_metrics'
    ) {
      navigation.navigate('SettingsScreen');
    }
    const { canGoBack, shouldExitFlow } = handleBackNavigation();

    if (shouldExitFlow) {
      // We're at the first step of the first major step
      // Ask user if they want to exit the flow
      Alert.alert(
        'Exit Setup',
        'Are you sure you want to exit the setup process? Your progress will be saved.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => navigation.navigate('GoalSetupScreen'),
          },
        ]
      );
      return;
    }

    if (canGoBack) {
      if (subSteps[majorStep] === 0) {
        // We're at the first sub-step of a major step (but not the first major step)
        navigation.navigate('GoalSetupScreen');
      }
      // The store has already handled updating the sub-step if we're not at the first sub-step
    }
  };

  return (
    <CustomSafeAreaView edges={['left', 'right']}>
      <View className="flex-1">
        {/* Header and Segmented Progress Bar */}
        <View className="px-4">
          <View className="flex-row items-center justify-between">
            <View style={{ width: 32 }} /> {/* Spacer to balance the row */}
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
            {/* Segmented Progress Bar */}
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
              isCurrentSubStepValid() ? 'opacity-100' : 'opacity-50'
            } h-[56px] rounded-[1000px] p-4 flex-row items-center justify-center gap-3`}
            onPress={handleContinue}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold">
                {majorStep === 2 &&
                subSteps[majorStep] === subStepCounts[majorStep] - 1
                  ? 'Confirm'
                  : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </CustomSafeAreaView>
  );
};
