import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IMAGE_CONSTANTS } from '../../constants/imageConstants';
import { Meal } from '../../types';
import { RootStackParamList } from '../../types/navigation';

interface MealFinderListViewProps {
  meals: Meal[];
  locationLoading: boolean;
  error: string | null;
  onRetry: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'MealFinderScreen'>;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;
  defaultDate?:string
}

export const MealFinderListView: React.FC<MealFinderListViewProps> = ({
  meals,
  locationLoading,
  error,
  onRetry,
  navigation,
  onScrollBegin,
  onScrollEnd,
  defaultDate
}) => {
  if (locationLoading) {
    return (
      <View className="flex items-center justify-center py-8">
        <ActivityIndicator size="large" color="#19a28f" />
        <Text className="text-[#888] mt-2">Finding nearby meals...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex items-center justify-center py-8">
        <Image
          source={IMAGE_CONSTANTS.warningIcon}
          className="w-[48px] h-[48px] mb-3 opacity-50"
        />
        <Text className="text-[#888] text-center text-base">
          Unable to load meal suggestions
        </Text>
        <Text className="text-[#888] text-center text-sm mt-1">
          Please check your connection and try again
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          className="mt-4 px-6 py-2 bg-primaryLight rounded-full"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (meals.length === 0) {
    return (
      <Text className="text-center text-[#888] mt-6">
        No nearby meal suggestions found.
      </Text>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
      onScrollBeginDrag={onScrollBegin}
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollBegin={onScrollBegin}
      onMomentumScrollEnd={onScrollEnd}
    >
      <Text className="text-base font-semibold text-[#222] mb-4">
        Nearby Suggestions
      </Text>
      {meals.map((meal, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() =>
            navigation.navigate('MealFinderBreakdownScreen', { meal , defaultDate})
          }
          className="flex-row bg-white rounded-xl mb-6 px-4 py-4 shadow-sm"
        >
          <View className="flex-row items-center justify-center bg-cornflowerBlue h-[48px] w-[48px] rounded-full mr-3 flex-shrink-0">
            <Image
              source={
                meal.imageUrl
                  ? { uri: String(meal.imageUrl) }
                  : IMAGE_CONSTANTS.restaurantIcon
              }
              className="w-[20px] h-[20px] rounded-full"
            />
          </View>

          <View className="flex-1 gap-1 pr-2">
            <View className="flex-col justify-start">
              <View className="flex-row items-start justify-between">
                <Text
                  className="text-sm font-medium text-[#222] mb-1 flex-1 mr-2"
                  numberOfLines={2}
                >
                  {meal.name}
                </Text>
                {meal.matchScore && meal.matchScore > 0 && (
                  <View className="bg-primary flex-row items-center justify-center rounded-2xl px-2.5 py-1.5 flex-shrink-0">
                    <Text className="text-xs font-medium text-white">
                      {meal.matchScore}% match
                    </Text>
                  </View>
                )}
              </View>
              <Text
                className="text-sm font-normal text-[#222] mb-1"
                numberOfLines={1}
                style={{ flexWrap: 'wrap' }}
              >
                {meal.restaurant.name}
              </Text>
              {meal.restaurant?.location ? (
                <Text
                  className="text-sm font-normal text-[#222] mb-1"
                  numberOfLines={1}
                  style={{ flexWrap: 'wrap' }}
                >
                  {meal.restaurant.location.split(',').slice(0, -1).join(',') ??
                    ''}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1">
                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-amber rounded-full">
                  <Text className="text-white text-[10px] text-center font-medium">
                    C
                  </Text>
                </View>
                <Text className="text-xs text-textMediumGrey text-center font-medium">
                  {meal.macros.carbs}g
                </Text>
              </View>

              <View className="flex-row items-center gap-1">
                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-lavenderPink rounded-full">
                  <Text className="text-white text-[10px] text-center font-medium">
                    F
                  </Text>
                </View>
                <Text className="text-xs text-textMediumGrey text-center font-medium">
                  {meal.macros.fat}g
                </Text>
              </View>

              <View className="flex-row items-center gap-1">
                <View className="flex-row items-center justify-center h-[16px] w-[16px] bg-gloomyPurple rounded-full">
                  <Text className="text-white text-[10px] text-center font-medium">
                    P
                  </Text>
                </View>
                <Text className="text-xs text-textMediumGrey text-center font-medium">
                  {meal.macros.protein}g
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
