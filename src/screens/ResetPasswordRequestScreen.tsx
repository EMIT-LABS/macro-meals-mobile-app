import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import BackButton from '../components/BackButton';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { authService } from '../services/authService';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ResetPasswordRequest'
>;

/**
 * Entry from Settings/Profile: send verification code to user's email,
 * then go to VerificationScreen → ResetPassword (with old + new + confirm).
 */
const ResetPasswordRequestScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const profile = useStore(state => state.profile);
  const [isLoading, setIsLoading] = useState(false);
  const email = profile?.email;

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert(
        'Error',
        "We couldn't find your email. Please log out and use Forgot password from the login screen."
      );
      return;
    }
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      navigation.navigate('VerificationScreen', { email, source: 'settings' });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : error?.message ||
            'Failed to send verification code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      <View className="flex-row items-center justify-start mb-3 px-6 pt-4">
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <View className="flex-1 px-6">
        <Text className="text-3xl font-medium mb-4 text-black">Password</Text>
        <Text className="text-base text-textMediumGrey mb-6">
          We'll send a verification code to{' '}
          <Text className="font-semibold">{email || 'your email'}</Text>. Enter
          the code on the next screen, then enter your current password and
          choose a new one.
        </Text>
        <CustomTouchableOpacityButton
          title="Send verification code"
          className="h-[56px] w-full items-center justify-center bg-primary rounded-[100px]"
          textClassName="text-white text-[17px] font-semibold"
          onPress={handleSendCode}
          isLoading={isLoading}
        />
      </View>
    </CustomSafeAreaView>
  );
};

export default ResetPasswordRequestScreen;
