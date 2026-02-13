import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import BackButton from '../components/BackButton';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { referralService } from '../services/referralService';
import { RootStackParamList } from '../types/navigation';
import { useMixpanel } from '@macro-meals/mixpanel';
import { userService } from '../services/userService';
import useStore, { shouldSkipPaywall } from '../store/useStore';
import { IsProContext } from '../contexts/IsProContext';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RedeemReferralCodeScreen'
>;

export const RedeemReferralCodeScreen: React.FC = () => {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const mixpanel = useMixpanel();
  const { setIsPro } = React.useContext(IsProContext);

  const handleRedeemCode = async () => {
    if (!referralCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    // Track redemption attempt
    mixpanel?.track({
      name: 'referral_code_redemption_attempted',
      properties: {
        source: 'settings_screen',
        platform: Platform.OS,
      },
    });

    setIsLoading(true);

    try {
      // Verify referral code before redeeming
      try {
        await referralService.verifyReferralCode(referralCode.trim());
      } catch (verifyError: any) {
        let verifyMessage = 'Invalid referral code. Please check and try again.';
        if (verifyError?.response?.data?.detail) {
          verifyMessage = verifyError.response.data.detail;
          if (verifyMessage.toLowerCase().includes('not found')) {
            verifyMessage = 'Referral code not found. Please check and try again.';
          } else if (verifyMessage.toLowerCase().includes('already')) {
            verifyMessage = 'This referral code has already been used.';
          }
        }
        Alert.alert('Invalid Referral Code', verifyMessage);
        return;
      } finally {
        setIsLoading(false);
      }
      setIsLoading(true);

      console.log('🎁 Redeeming referral code from settings:', referralCode);
      await referralService.redeemReferralCode(referralCode.trim());

      // Fetch updated profile to get new is_pro and referral
      const updatedProfile = await userService.getProfile();
      const { setProfile } = useStore.getState();
      setProfile(updatedProfile);
      
      // Update isPro context if user has pro or active referral
      if (shouldSkipPaywall(updatedProfile)) {
        setIsPro(true);
      }

      console.log('✅ Referral code redeemed successfully from settings');

      // Track successful redemption
      mixpanel?.track({
        name: 'referral_code_redeemed',
        properties: {
          source: 'settings_screen',
          referral_code: referralCode.trim(),
          platform: Platform.OS,
        },
      });

      Alert.alert(
        'Success!',
        'Your referral code has been redeemed successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Failed to redeem referral code from settings:', error);

      // Extract error message
      let errorMessage = 'Failed to redeem referral code. Please try again.';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        
        // Handle specific error cases
        if (errorMessage.toLowerCase().includes('not found')) {
          errorMessage = 'Invalid referral code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('already')) {
          errorMessage = 'This referral code has already been used.';
        }
      }

      // Track failed redemption
      mixpanel?.track({
        name: 'referral_code_redemption_failed',
        properties: {
          source: 'settings_screen',
          referral_code: referralCode.trim(),
          error: errorMessage,
          platform: Platform.OS,
        },
      });

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 p-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1">
            <View className="flex-row items-center justify-start mb-6">
              <BackButton onPress={() => navigation.goBack()} />
            </View>

            <Text className="text-3xl font-medium text-black mb-2">
              Redeem Referral Code
            </Text>
            <Text className="text-[18px] font-normal text-textMediumGrey mb-8 leading-7">
              Enter your referral code below to unlock special benefits and
              rewards.
            </Text>

            <View className="w-full">
              <TextInput
                className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                placeholder="Enter referral code"
                placeholderTextColor="#9CA3AF"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <View className="w-full mt-8 mb-4">
            <CustomTouchableOpacityButton
              className={`h-[54px] w-full items-center justify-center bg-primary rounded-[100px] ${
                isLoading || !referralCode.trim() ? 'opacity-50' : ''
              }`}
              title="Redeem Code"
              textClassName="text-white text-[17px] font-semibold"
              disabled={isLoading || !referralCode.trim()}
              onPress={handleRedeemCode}
              isLoading={isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CustomSafeAreaView>
  );
};

export default RedeemReferralCodeScreen;
