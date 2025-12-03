import React from 'react';
import { Text, View } from 'react-native';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';
import QuestionSelector from '../QuestionSelector';

export const AdjustGoalsDietaryPreference: React.FC = () => {
  const dietaryPreference = useAdjustGoalsFlowStore(
    state => state.dietaryPreference
  );
  const setDietaryPreference = useAdjustGoalsFlowStore(
    state => state.setDietaryPreference
  );

  return (
    <View className="flex-1 h-full">
      <View className="flex-col items-start w-full mt-4">
        <Text className="font-general-sans-semibold text-3xl font-600 mb-10 tracking-[0]">
          Dietary preference
        </Text>
        <QuestionSelector
          icon={IMAGE_CONSTANTS.vegetarianIcon}
          selected={dietaryPreference === 'Vegetarian'}
          onPress={() => setDietaryPreference('Vegetarian')}
          text="Vegetarian"
        />
        <QuestionSelector
          icon={IMAGE_CONSTANTS.ketoIcon}
          selected={dietaryPreference === 'Keto'}
          onPress={() => setDietaryPreference('Keto')}
          text="Keto"
        />
        <QuestionSelector
          icon={IMAGE_CONSTANTS.pescatarianIcon}
          selected={dietaryPreference === 'Pescetarian'}
          onPress={() => setDietaryPreference('Pescetarian')}
          text="Pescetarian"
        />
        <QuestionSelector
          icon={IMAGE_CONSTANTS.balanceIcon}
          selected={dietaryPreference === 'Balanced'}
          onPress={() => setDietaryPreference('Balanced')}
          text="Balanced"
        />
      </View>
    </View>
  );
};
