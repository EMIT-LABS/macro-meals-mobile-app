import React from 'react';
import { Text, View } from 'react-native';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';
import QuestionSelector from '../QuestionSelector';

export const AdjustGoalsFitnessGoal: React.FC = () => {
  const fitnessGoal = useAdjustGoalsFlowStore(state => state.fitnessGoal);
  const setFitnessGoal = useAdjustGoalsFlowStore(state => state.setFitnessGoal);
  const setTargetWeight = useAdjustGoalsFlowStore(
    state => state.setTargetWeight
  );
  const setProgressRate = useAdjustGoalsFlowStore(
    state => state.setProgressRate
  );
  const weight_unit_preference = useAdjustGoalsFlowStore(
    state => state.weight_unit_preference
  );
  const weightLb = useAdjustGoalsFlowStore(state => state.weightLb);
  const weightKg = useAdjustGoalsFlowStore(state => state.weightKg);
  const markSubStepComplete = useAdjustGoalsFlowStore(
    state => state.markSubStepComplete
  );

  const handleLoseWeight = () => {
    console.log('Clicked: Lose weight');
    setFitnessGoal('Lose weight');
  };

  const handleMaintainWeight = () => {
    console.log('Clicked: Maintain weight');
    setFitnessGoal('Maintain weight');
    const currentWeight =
      weight_unit_preference === 'imperial' ? weightLb : weightKg;
    if (currentWeight !== null && currentWeight !== undefined) {
      setTargetWeight(currentWeight);
      setProgressRate(0);
      markSubStepComplete(1, 1);
      markSubStepComplete(1, 2);
    }
  };

  const handleGainWeight = () => {
    console.log('Clicked: Gain weight');
    setFitnessGoal('Gain weight');
  };

  return (
    <View className="flex-1 h-full" pointerEvents="auto" style={{ flex: 1 }}>
      <View className="flex-col items-start w-full mt-4">
        <Text className="font-general-sans-semibold tracking-tighter text-3xl font-600 mb-10">
          Fitness goal
        </Text>
        <QuestionSelector
          icon={IMAGE_CONSTANTS.loseWeightIcon}
          selected={fitnessGoal === 'Lose weight'}
          onPress={handleLoseWeight}
          text="Lose weight"
        />
        <QuestionSelector
          icon={IMAGE_CONSTANTS.maintainWeightIcon}
          selected={fitnessGoal === 'Maintain weight'}
          onPress={handleMaintainWeight}
          text="Maintain weight"
        />
        <QuestionSelector
          icon={IMAGE_CONSTANTS.gainWeightIcon}
          selected={fitnessGoal === 'Gain weight'}
          onPress={handleGainWeight}
          text="Gain weight"
        />
      </View>
    </View>
  );
};
