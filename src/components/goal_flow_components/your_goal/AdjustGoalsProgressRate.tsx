import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';

export const AdjustGoalsProgressRate: React.FC = () => {
  const progressRate = useAdjustGoalsFlowStore((s) => s.progressRate);
  const setProgressRate = useAdjustGoalsFlowStore((s) => s.setProgressRate);
  const weight_unit_preference = useAdjustGoalsFlowStore((s) => s.weight_unit_preference);
  const weightLb = useAdjustGoalsFlowStore((s) => s.weightLb);
  const weightKg = useAdjustGoalsFlowStore((s) => s.weightKg);
  const targetWeight = useAdjustGoalsFlowStore((s) => s.targetWeight);
  const fitnessGoal = useAdjustGoalsFlowStore((s) => s.fitnessGoal);
  const currentWeight = weight_unit_preference === 'imperial' ? (weightLb || 0) : (weightKg || 0);
  const weightDifference = Math.abs((targetWeight || 0) - currentWeight);
  const getRecommendedRate = () => {
    if (fitnessGoal === 'Lose weight') {
      return weight_unit_preference === 'imperial' ? 1.0 : 0.45;
    } else if (fitnessGoal === 'Gain weight') {
      return weight_unit_preference === 'imperial' ? 0.5 : 0.23;
    }
    return 0;
  };
  const value = typeof progressRate === 'number' && progressRate > 0 ? progressRate : getRecommendedRate();
  const [sliderValue, setSliderValue] = useState(value);
  useEffect(() => { setSliderValue(value); }, [value]);
  const didSetInitial = useRef(false);
  useEffect(() => {
    if (!didSetInitial.current && (!progressRate || progressRate === 0)) {
      setProgressRate(getRecommendedRate());
      didSetInitial.current = true;
    }
  }, []);
  const weekly = value;
  const monthly = (weekly * 4).toFixed(2);
  const isUnreasonableRate = () => {
    const timeToGoal = weightDifference / value;
    if (timeToGoal < 4 && weightDifference > 10) {
      return true;
    }
    if (fitnessGoal === 'Lose weight' && value > 2.0) {
      return true;
    }
    if (fitnessGoal === 'Gain weight' && value > 1.0) {
      return true;
    }
    return false;
  };
  const unreasonable = isUnreasonableRate();
  const trackColor = unreasonable ? "#E53835" : "#009688";
  const textColor = unreasonable ? "#E53835" : "#01675B";
  const rateText = unreasonable ? "Faster (be careful)" : "Standard (Recommended)";
  const weightUnit = weight_unit_preference === 'imperial' ? 'lbs' : 'kg';
  const rateSign = fitnessGoal === 'Lose weight' ? '-' : '+';
  return (
    <View className="flex-1 bg-white px-4 pt-2">
      <Text className="text-3xl font-bold mt-4">At what rate do you want to achieve this goal?</Text>
      <View className="flex-1 items-center justify-center w-full">
        <Text className="text-[20px] font-semibold mb-1 text-center" style={{ color: textColor }}>{rateText}</Text>
        <View className="items-center w-full mb-4">
          {Platform.OS === 'android' ? (
            <Slider style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={weight_unit_preference === 'imperial' ? 3.0 : 1.36} step={0.01} value={sliderValue} minimumTrackTintColor={trackColor} maximumTrackTintColor="#E0E0E0" thumbTintColor={trackColor} thumbImage={IMAGE_CONSTANTS.checkPrimary} onValueChange={val => setSliderValue(Math.round(val * 100) / 100)} onSlidingComplete={val => setProgressRate(Math.round(val * 100) / 100)} />
          ) : (
            <Slider style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={weight_unit_preference === 'imperial' ? 3.0 : 1.36} step={0.01} value={value} minimumTrackTintColor={trackColor} maximumTrackTintColor="#E0E0E0" thumbTintColor={trackColor} thumbImage={IMAGE_CONSTANTS.checkPrimary} onValueChange={setProgressRate} />
          )}
        </View>
        <Text className="text-base font-normal text-black text-center mb-2">{rateSign}{(Platform.OS === 'android' ? sliderValue : value).toFixed(2)} {weightUnit} / week</Text>
        <Text className="text-base text-black text-center mb-4">{rateSign}{monthly} {weightUnit} / month</Text>
      </View>
    </View>
  );
};



