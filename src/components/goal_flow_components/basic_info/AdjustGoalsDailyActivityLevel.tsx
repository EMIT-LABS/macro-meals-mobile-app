import React from 'react';
import { View, Text } from 'react-native';
import QuestionSelector from '../QuestionSelector';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';

export const AdjustGoalsDailyActivityLevel: React.FC = () => {
  const dailyActivityLevel = useAdjustGoalsFlowStore((state) => state.dailyActivityLevel);
  const setDailyActivityLevel = useAdjustGoalsFlowStore((state) => state.setDailyActivityLevel);

  return (
    <View className="flex-1 h-full">
      <View className="flex-col items-start w-full mt-4">
        <Text className='font-general-sans-semibold text-3xl font-600 mb-10 tracking-[0]'>Daily activity level</Text>
        <QuestionSelector icon={IMAGE_CONSTANTS.notVeryActiveIcon} selected={dailyActivityLevel === 'Not very active'} onPress={() => setDailyActivityLevel('Not very active')} text="Not very active" />
        <QuestionSelector icon={IMAGE_CONSTANTS.lightlyActiveIcon} selected={dailyActivityLevel === 'Lightly active'} onPress={() => setDailyActivityLevel('Lightly active')} text="Lightly active" />
        <QuestionSelector icon={IMAGE_CONSTANTS.activeIcon} selected={dailyActivityLevel === 'Active'} onPress={() => setDailyActivityLevel('Active')} text="Active" />
        <QuestionSelector icon={IMAGE_CONSTANTS.veryActiveIcon} selected={dailyActivityLevel === 'Very active'} onPress={() => setDailyActivityLevel('Very active')} text="Very active" />
      </View>
    </View>
  );
};



