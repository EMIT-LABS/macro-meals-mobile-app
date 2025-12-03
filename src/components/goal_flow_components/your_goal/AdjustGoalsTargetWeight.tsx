import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Image, TouchableWithoutFeedback, Keyboard, Platform, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';

const weightsLb = Array.from({ length: 321 }, (_, i) => i + 80); // 80-400 lbs
const weightsKg = Array.from({ length: 146 }, (_, i) => i + 35); // 35-180 kg
const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 360;
const isLargeScreen = screenWidth > 600;
const getPickerWidth = (unit: 'imperial' | 'metric') => {
  if (isSmallScreen) return unit === 'imperial' ? 100 : 120;
  else if (isLargeScreen) return unit === 'imperial' ? 140 : 160;
  else return unit === 'imperial' ? 120 : 140;
};
const getPickerHeight = () => (isSmallScreen ? 50 : isLargeScreen ? 70 : 60);

export const AdjustGoalsTargetWeight: React.FC = () => {
  const targetWeight = useAdjustGoalsFlowStore((s) => s.targetWeight);
  const setTargetWeight = useAdjustGoalsFlowStore((s) => s.setTargetWeight);
  const fitnessGoal = useAdjustGoalsFlowStore((s) => s.fitnessGoal);
  const weight_unit_preference = useAdjustGoalsFlowStore((s) => s.weight_unit_preference);
  const weightLb = useAdjustGoalsFlowStore((s) => s.weightLb);
  const weightKg = useAdjustGoalsFlowStore((s) => s.weightKg);
  const previousWeight = useMemo(() => weight_unit_preference === 'imperial' ? weightLb ?? 0 : weightKg ?? 0, [weight_unit_preference, weightLb, weightKg]);
  const initialWeight = useMemo(() => targetWeight || Math.round(previousWeight) || (weight_unit_preference === 'imperial' ? 150 : 70), [targetWeight, previousWeight, weight_unit_preference]);
  const [weight, setWeight] = useState(initialWeight);
  useEffect(() => { setTargetWeight(weight); }, [weight, setTargetWeight]);
  const isRed = useMemo(() => {
    if (fitnessGoal === 'Gain weight' && weight < previousWeight) return true;
    if (fitnessGoal === 'Lose weight' && weight > previousWeight) return true;
    return false;
  }, [fitnessGoal, weight, previousWeight]);
  const weightUnit = weight_unit_preference === 'imperial' ? 'lbs' : 'kg';
  const handleWeightChange = (newWeight: number) => { setWeight(newWeight); };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 bg-white">
        <Text className="text-3xl font-bold mt-4">Target weight</Text>
        <Text className="text-base text-gray-500 mt-3 mb-6">You can always change it later.</Text>
        <View className="items-center mt-8">
          <Text className="text-base text-center mb-4">{fitnessGoal || 'Set your goal'}</Text>
          <View className="flex-row items-center justify-center mb-0">
            <Text className={`text-4xl font-semibold text-center ${isRed ? 'text-cinnabarRed' : 'text-black'}`}>{weight}</Text>
            <Text className="text-2xl font-semibold ml-2">{weightUnit}</Text>
          </View>
          {Platform.OS === 'ios' && isRed && (
            <View className="flex-row items-center justify-center mt-2 mb-2">
              <Image source={IMAGE_CONSTANTS.warningIcon} className="w-[16px] h-[16px] mr-1" />
              <Text className="text-red-500 text-sm">
                {fitnessGoal === 'Gain weight'
                  ? 'You chose a goal of gaining weight.'
                  : fitnessGoal === 'Lose weight'
                  ? 'You chose a goal of losing weight.'
                  : ''}
              </Text>
            </View>
          )}
          <View className={`items-center ${Platform.OS === 'android' ? '-mt-16' : ''}`}>
            {weight_unit_preference === 'imperial' ? (
              <View className={`${Platform.OS === 'ios' ? '' : 'border-b border-gray-100'}`}>
                <Picker selectedValue={weight} style={{ width: getPickerWidth('imperial'), height: getPickerHeight(), color: '#000000', backgroundColor: '#FFFFFF', borderWidth: Platform.OS === 'android' ? 1 : 0, borderColor: Platform.OS === 'android' ? '#6b7280' : 'transparent', borderRadius: Platform.OS === 'android' ? 4 : 0 }} itemStyle={{ fontSize: 18, color: '#000000' }} onValueChange={handleWeightChange} dropdownIconColor={Platform.OS === 'android' ? '#6b7280' : undefined} mode={Platform.OS === 'android' ? 'dialog' : undefined} >
                  <Picker.Item label="" value={null} style={{color: '#000000'}} />
                  {weightsLb.map(lb => (
                    <Picker.Item key={lb} label={`${lb} lb`} style={{color: '#000000'}} value={lb} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View className={`${Platform.OS === 'ios' ? '' : 'border-b border-gray-100'}`}>
                <Picker selectedValue={weight} style={{ width: getPickerWidth('metric'), height: getPickerHeight(), color: 'transparent', backgroundColor: 'transparent', borderWidth: Platform.OS === 'android' ? 1 : 0, borderColor: Platform.OS === 'android' ? '#6b7280' : 'transparent', borderRadius: Platform.OS === 'android' ? 4 : 0 }} itemStyle={{ fontSize: 18, color: '#000000' }} onValueChange={handleWeightChange} dropdownIconColor={Platform.OS === 'android' ? '#6b7280' : undefined} mode={Platform.OS === 'android' ? 'dialog' : undefined} >
                  <Picker.Item label="" value={null} style={{color: '#000000'}} />
                  {weightsKg.map(kg => (
                    <Picker.Item key={kg} label={`${kg} kg`} style={{color: '#000000'}} value={kg} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
          {Platform.OS === 'android' && isRed && (
            <View className="flex-row items-center justify-center mt-2">
              <Image source={IMAGE_CONSTANTS.warningIcon} className="w-[16px] h-[16px] mr-1" />
              <Text className="text-red-500 text-sm">
                {fitnessGoal === 'Gain weight'
                  ? 'You chose a goal of gaining weight.'
                  : fitnessGoal === 'Lose weight'
                  ? 'You chose a goal of losing weight.'
                  : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};



