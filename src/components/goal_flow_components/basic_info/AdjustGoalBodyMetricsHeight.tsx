import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAdjustGoalsFlowStore } from 'src/store/adjustGoalsFlowStore';

const heightsFt = [3, 4, 5, 6, 7, 8, 9];
const heightsIn = Array.from({ length: 12 }, (_, i) => i);
const heightsCm = Array.from({ length: 121 }, (_, i) => 100 + i); // 100cm to 220cm

export const AdjustGoalBodyMetricsHeight = () => {
  const {
    height_unit_preference, setHeightUnitPreference,
    heightFt, setHeightFt,
    heightIn, setHeightIn,
    heightCm, setHeightCm,
    markSubStepComplete,
    majorStep,
    subSteps
  } = useAdjustGoalsFlowStore();

  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (height_unit_preference === 'imperial') {
      setIsValid(heightFt !== null && heightIn !== null);
      if (heightFt !== null && heightIn !== null) {
        const calculatedHeight = heightFt + (heightIn / 12);
        const calculatedHeightRounded = parseFloat(calculatedHeight.toFixed(2));
        console.log('[AdjustGoalsFlow] Height calculation:', {
          feet: heightFt,
          inches: heightIn,
          calculatedHeightValue: calculatedHeightRounded,
          calculation: `${heightFt} + (${heightIn} / 12) = ${calculatedHeightRounded}`
        });
      }
    } else {
      setIsValid(heightCm !== null);
      if (heightCm !== null) {
        console.log('[AdjustGoalsFlow] Height calculation (metric):', {
          heightCm: heightCm,
          calculatedHeightValue: heightCm,
          calculation: `Using heightCm directly: ${heightCm}`
        });
      }
    }
  }, [height_unit_preference, heightFt, heightIn, heightCm]);

  useEffect(() => {
    if (isValid) {
      markSubStepComplete(majorStep, subSteps[majorStep]);
    }
  }, [isValid, majorStep, subSteps, markSubStepComplete]);

  return (
    <View className="flex-1 bg-white px-4">
      <Text className="text-3xl font-bold mt-4">Height metrics</Text>
      <Text className="text-base text-gray-500 mb-6">This will be used to calibrate your custom plan</Text>
      <View className="flex-row items-center justify-center mb-6">
        <Text className={`text-lg mr-2 ${height_unit_preference === 'imperial' ? 'text-black font-semibold' : 'font-normal text-textMediumGrey'}`}>Imperial</Text>
        <Switch
          value={height_unit_preference === 'metric'}
          onValueChange={v => setHeightUnitPreference(v ? 'metric' : 'imperial')}
          trackColor={{ false: '#009688', true: '#009688' }}
          thumbColor="#ffffff"
          ios_backgroundColor="#009688"
        />
        <Text className={`text-lg ml-2 ${height_unit_preference === 'metric' ? 'text-black font-semibold' : 'font-normal text-textMediumGrey'}`}>Metric</Text>
      </View>
      {height_unit_preference === 'imperial' ? (
        <View className="flex-row justify-between ml-5">
          <View className="flex-1 items-center">
            <Text className="text-base font-medium mb-2">Height</Text>
            <View className="flex-row gap-4">
              <View className={`${Platform.OS === 'ios' ? '' : 'border-b border-gray-100'}`}> 
                <Picker
                  selectedValue={heightFt}
                  style={{
                    width: 100,
                    height: 50,
                    color: '#000000',
                    backgroundColor: '#FFFFFF',
                    borderWidth: Platform.OS === 'android' ? 1 : 0,
                    borderColor: Platform.OS === 'android' ? '#6b7280' : 'transparent',
                    borderRadius: Platform.OS === 'android' ? 4 : 0
                  }}
                  itemStyle={{ fontSize: 18, color: '#000000' }}
                  onValueChange={setHeightFt}
                  dropdownIconColor={Platform.OS === 'android' ? '#6b7280' : undefined}
                  mode={Platform.OS === 'android' ? 'dialog' : undefined}
                >
                  <Picker.Item label="ft" value={null} style={{color: '#000000'}} />
                  {heightsFt.map(ft => (
                    <Picker.Item key={ft} label={`${ft} ft`} style={{color: '#000000'}} value={ft} />
                  ))}
                </Picker>
              </View>
              <View className={`${Platform.OS === 'ios' ? '' : 'border-b border-gray-100'}`}> 
                <Picker
                  selectedValue={heightIn}
                  style={{
                    width: 100,
                    height: 50,
                    color: '#000000',
                    backgroundColor: '#FFFFFF',
                    borderWidth: Platform.OS === 'android' ? 1 : 0,
                    borderColor: Platform.OS === 'android' ? '#6b7280' : 'transparent',
                    borderRadius: Platform.OS === 'android' ? 4 : 0
                  }}
                  itemStyle={{ fontSize: 18, color: '#000000' }}
                  onValueChange={setHeightIn}
                  dropdownIconColor={Platform.OS === 'android' ? '#6b7280' : undefined}
                  mode={Platform.OS === 'android' ? 'dialog' : undefined}
                >
                  <Picker.Item label="in" value={null} style={{color: '#000000'}} />
                  {heightsIn.map(inc => (
                    <Picker.Item key={inc} label={`${inc} in`} style={{color: '#000000'}} value={inc} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row justify-between">
          <View className="flex-1 items-center">
            <Text className="text-base font-medium mb-2">Height</Text>
            <View className={`${Platform.OS === 'ios' ? '' : 'border-b border-gray-100'}`}> 
              <Picker
                selectedValue={heightCm}
                style={{
                  width: 140,
                  height: 50,
                  color: '#000000',
                  backgroundColor: '#FFFFFF',
                  borderWidth: Platform.OS === 'android' ? 1 : 0,
                  borderColor: Platform.OS === 'android' ? '#6b7280' : 'transparent',
                  borderRadius: Platform.OS === 'android' ? 4 : 0
                }}
                itemStyle={{ fontSize: 18, color: '#000000' }}
                onValueChange={setHeightCm}
                dropdownIconColor={Platform.OS === 'android' ? '#6b7280' : undefined}
                mode={Platform.OS === 'android' ? 'dialog' : undefined}
              >
                <Picker.Item label="cm" value={null} style={{color: '#000000'}} />
                {heightsCm.map(cm => (
                  <Picker.Item key={cm} label={`${cm} cm`} style={{color: '#000000'}} value={cm} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};



