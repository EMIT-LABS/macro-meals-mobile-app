import Slider from '@react-native-community/slider';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';
import { useGoalsFlowStore } from 'src/store/goalsFlowStore';

export const GoalsProgressRate: React.FC = () => {
  const progressRate = useGoalsFlowStore(s => s.progressRate); // number
  const setProgressRate = useGoalsFlowStore(s => s.setProgressRate);
  const weight_unit_preference = useGoalsFlowStore(
    s => s.weight_unit_preference
  );
  const weightLb = useGoalsFlowStore(s => s.weightLb);
  const weightKg = useGoalsFlowStore(s => s.weightKg);
  const targetWeight = useGoalsFlowStore(s => s.targetWeight);
  const fitnessGoal = useGoalsFlowStore(s => s.fitnessGoal);

  // Get current weight based on unit
  const currentWeight =
    weight_unit_preference === 'imperial' ? weightLb || 0 : weightKg || 0;

  // Calculate weight difference
  const weightDifference = Math.abs((targetWeight || 0) - currentWeight);

  // Define recommended rates (safe defaults)
  const getRecommendedRate = () => {
    if (fitnessGoal === 'Lose weight') {
      return weight_unit_preference === 'imperial' ? 1.0 : 0.45;
    } else if (fitnessGoal === 'Gain weight') {
      return weight_unit_preference === 'imperial' ? 0.5 : 0.23;
    }
    return 0;
  };

  // Define thresholds: recommendedMax is the boundary between green (recommended) and red (unrecommended)
  // Task: Green zone left to middle for recommended rates, red above threshold
  // Fixed thresholds based on MyFitnessPal and standard medical guidelines:
  // - Weight loss: Up to 2 lbs/week (0.9 kg/week) is generally safe
  // - Weight gain: Up to 1 lb/week (0.45 kg/week) is generally safe
  const getThresholds = () => {
    if (fitnessGoal === 'Lose weight') {
      return {
        recommendedMax: weight_unit_preference === 'imperial' ? 2.0 : 0.9,
      };
    } else if (fitnessGoal === 'Gain weight') {
      return {
        recommendedMax: weight_unit_preference === 'imperial' ? 1.0 : 0.45,
      };
    }
    return {
      recommendedMax: 0,
    };
  };

  // Default value if not set, otherwise use recommended rate
  const value =
    typeof progressRate === 'number' && progressRate > 0
      ? progressRate
      : getRecommendedRate();

  const [sliderValue, setSliderValue] = useState(value);
  const [isSliderTouched, setIsSliderTouched] = useState(false);

  // Only sync sliderValue with value when slider is NOT being touched
  // This fixes the flicker issue: https://github.com/callstack/react-native-slider/issues/716
  useEffect(() => {
    if (!isSliderTouched) {
      setSliderValue(value);
    }
  }, [value, isSliderTouched]);

  const didSetInitial = useRef(false);
  useEffect(() => {
    if (!didSetInitial.current && (!progressRate || progressRate === 0)) {
      setProgressRate(getRecommendedRate());
      didSetInitial.current = true;
    }
  }, []);

  const thresholds = useMemo(
    () => getThresholds(),
    [fitnessGoal, weight_unit_preference]
  );

  // CRITICAL: On Android, use 'value' (committed) for colors to prevent flicker
  // Use 'sliderValue' for label text and numbers (real-time updates)
  // On iOS, use 'value' for everything
  const displayRate = Platform.OS === 'android' ? sliderValue : value;

  // Calculate weekly and monthly rates (real-time on Android)
  const weekly = displayRate;
  const monthly = (weekly * 4).toFixed(2);

  // Determine zones: Two zones only - Green (recommended) or Red (unrecommended)
  // Task: Green left to middle for recommended rates, red above threshold
  // For LABEL TEXT (uses displayRate - real-time on Android)
  const isTimeBasedUnreasonableForLabel = () => {
    if (displayRate === 0) return false;
    const timeToGoal = weightDifference / displayRate;
    return timeToGoal < 4 && weightDifference > 10;
  };
  const isUnrecommendedForLabel =
    displayRate > thresholds.recommendedMax ||
    isTimeBasedUnreasonableForLabel();

  // For COLORS (uses value - committed value, no flicker)
  const isTimeBasedUnreasonableForColor = () => {
    if (value === 0) return false;
    const timeToGoal = weightDifference / value;
    return timeToGoal < 4 && weightDifference > 10;
  };
  const isUnrecommendedForColor =
    value > thresholds.recommendedMax || isTimeBasedUnreasonableForColor();

  // Two zones only: Green (recommended) or Red (unrecommended)
  const trackColor = isUnrecommendedForColor ? '#E53835' : '#009688'; // Red or Green
  const textColor = isUnrecommendedForLabel ? '#E53835' : '#01675B'; // Red or Teal
  const rateText = isUnrecommendedForLabel
    ? 'Unrecommended rate'
    : 'Standard (Recommended)';

  // Weight unit for display
  const weightUnit = weight_unit_preference === 'imperial' ? 'lbs' : 'kg';

  // Rate sign based on fitness goal
  const rateSign = fitnessGoal === 'Lose weight' ? '-' : '+';

  return (
    <View className="flex-1 bg-white px-4 pt-2">
      {/* Title */}
      <Text className="text-3xl font-bold mt-4">
        At what rate do you want to achieve this goal?
      </Text>
      <View className="flex-1 items-center justify-center w-full">
        <Text
          className="text-[20px] font-semibold mb-1 text-center"
          style={{ color: textColor }}
        >
          {rateText}
        </Text>

        <View className="items-center w-full mb-4">
          {Platform.OS === 'android' ? (
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={weight_unit_preference === 'imperial' ? 2.75 : 1.25}
              step={0.01}
              value={sliderValue}
              minimumTrackTintColor={trackColor}
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor={trackColor}
              thumbImage={IMAGE_CONSTANTS.checkPrimary}
              onTouchStart={() => setIsSliderTouched(true)}
              onTouchEnd={() => setIsSliderTouched(false)}
              onValueChange={val => {
                if (!isSliderTouched) {
                  return;
                }
                setSliderValue(Math.round(val * 100) / 100);
              }}
              onSlidingComplete={val => {
                const roundedVal = Math.round(val * 100) / 100;
                setProgressRate(roundedVal);
                setIsSliderTouched(false);
              }}
            />
          ) : (
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={weight_unit_preference === 'imperial' ? 2.75 : 1.25}
              step={0.01}
              value={value}
              minimumTrackTintColor={trackColor}
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor={trackColor}
              thumbImage={IMAGE_CONSTANTS.checkPrimary}
              onValueChange={setProgressRate}
            />
          )}
        </View>

        <Text className="text-base font-normal text-black text-center mb-2">
          {rateSign}
          {weekly.toFixed(2)} {weightUnit} / week
        </Text>
        <Text className="text-base text-black text-center mb-4">
          {rateSign}
          {monthly} {weightUnit} / month
        </Text>
      </View>
    </View>
  );
};
