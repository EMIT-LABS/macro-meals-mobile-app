import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IMAGE_CONSTANTS } from 'src/constants/imageConstants';

export const QuestionSelector = ({
  icon,
  selected,
  onPress,
  text,
}: {
  icon: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
  text: string;
}) => {
  console.log(text);
  return (
    <TouchableOpacity
      className={`h-[68px] w-full border ${selected ? 'border-primary' : 'border-silver'} rounded-md mb-6 flex-row items-center justify-center`}
      onPress={onPress}
    >
      <View className="px-4 h-[68px] w-full flex-row items-center justify-between">
        <View className="flex-row items-center justify-center">
          <Image source={icon} className="w-[16px] h-[16px]" />
          <Text
            className={`text-base ${selected ? 'font-semibold' : 'font-medium'} font-600 ml-2`}
          >
            {text}
          </Text>
        </View>
        {selected ? (
          <View className="flex-row items-center justify-center border border-silver h-[24px] rounded-full w-[24px]">
            <Image
              source={IMAGE_CONSTANTS.checkPrimary}
              className="w-[20px] h-[20px]"
            />
          </View>
        ) : (
          <View className="flex-row items-center justify-center border border-silver h-[24px] rounded-full w-[24px]">
            <View className="flex-row items-center justify-center border border-silver h-[24px] rounded-full w-[24px]" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default QuestionSelector;
