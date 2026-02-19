import { useMixpanel } from '@macro-meals/mixpanel/src';
import { usePosthog } from '@macro-meals/posthog_service/src';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RootStackParamList } from 'src/types/navigation';
import BackButton from '../components/BackButton';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { authService } from '../services/authService';

type ForgotPasswordScreenRouteProp = RouteProp<
  RootStackParamList,
  'ForgotPasswordScreen'
>;
type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPasswordScreen'
>;

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const route = useRoute<ForgotPasswordScreenRouteProp>();

  const source = route.params?.source ?? 'Forgot';
  const [errors, setErrors] = useState({ email: '' });
  const [touched, setTouched] = useState(false);
  const mixpanel = useMixpanel();
  const posthog = usePosthog();

  const eventsFired = useRef(false);

  useEffect(() => {
    if (!eventsFired.current) {
      eventsFired.current = true;
      mixpanel?.track({
        name: 'forgot_password_screen_viewed',
        properties: { platform: Platform.OS },
      });
      posthog?.track({
        name: 'forgot_password_screen_viewed',
        properties: {
          platform: Platform.OS,
          $screen_name: 'ForgotPasswordScreen',
          $current_url: 'ForgotPasswordScreen',
        },
      });
    }
  }, [mixpanel, posthog]);

  // Validation function for email
  const validateEmail = (text: string) => {
    if (!text) {
      return 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(text)) {
      return 'Email is invalid';
    }
    return '';
  };

  const isDisabled = () => {
    return isLoading || !!validateEmail(email);
  };

  const handleForgotPassword = async () => {
    setTouched(true);

    const emailError = validateEmail(email);
    setErrors({ email: emailError });

    if (emailError) {
      return;
    }
    mixpanel?.track({
      name: 'send_reset_code_attempted',
      properties: {
        email_domain: email.split('@')[1] || '',
        platform: Platform.OS,
      },
    });
    posthog?.track({
      name: 'send_reset_code_attempted',
      properties: {
        email_domain: email.split('@')[1] || '',
        platform: Platform.OS,
        $screen_name: 'ForgotPasswordScreen',
        $current_url: 'ForgotPasswordScreen',
      },
    });
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      mixpanel?.track({
        name: 'send_reset_code_successful',
        properties: {
          email_domain: email.split('@')[1] || '',
          platform: Platform.OS,
        },
      });
      posthog?.track({
        name: 'send_reset_code_successful',
        properties: {
          email_domain: email.split('@')[1] || '',
          platform: Platform.OS,
          $screen_name: 'ForgotPasswordScreen',
          $current_url: 'ForgotPasswordScreen',
        },
      });
      navigation.navigate('VerificationScreen', { email: email, source });
    } catch (error) {
      let errorMessage = 'Invalid email. Please try again.';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      mixpanel?.track({
        name: 'send_reset_code_failed',
        properties: {
          email_domain: email.split('@')[1] || '',
          error_type: errorMessage,
          platform: Platform.OS,
        },
      });
      posthog?.track({
        name: 'send_reset_code_failed',
        properties: {
          email_domain: email.split('@')[1] || '',
          error_type: errorMessage,
          platform: Platform.OS,
          $screen_name: 'ForgotPasswordScreen',
          $current_url: 'ForgotPasswordScreen',
        },
      });

      Alert.alert('Forgot Password Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const headerText =
    source === 'settings' ? 'Reset your password' : 'Forgot your password?';

  const handleBackToSignIn = () => {
    mixpanel?.track({
      name: 'back_to_sign_in_clicked',
      properties: { platform: Platform.OS },
    });
    posthog?.track({
      name: 'back_to_sign_in_clicked',
      properties: {
        platform: Platform.OS,
        $screen_name: 'ForgotPasswordScreen',
        $current_url: 'ForgotPasswordScreen',
      },
    });
    navigation.goBack();
  };

  return (
    <CustomSafeAreaView
      className="flex-1 items-start justify-start"
      edges={['left', 'right']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 relative p-6">
          <View className="flex-row items-center justify-start mb-3">
            <BackButton onPress={handleBackToSignIn} />
          </View>
          <Text className="text-3xl font-medium text-black mb-2">
            {headerText}
          </Text>
          <Text className="text-[18px] font-normal text-textMediumGrey mb-8 leading-7">
            Enter your email and we’ll send you a code to reset your password.
          </Text>

          <View className="w-full">
            <View
              className={`mb-2 ${
                touched && errors.email
                  ? 'border border-[#ff6b6b] rounded-md'
                  : ''
              }`}
            >
              <TextInput
                className={`border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]`}
                placeholder="Enter your email"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (touched) {
                    setErrors({ email: validateEmail(text) });
                  }
                }}
                onBlur={() => {
                  setTouched(true);
                  setErrors({ email: validateEmail(email) });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                spellCheck={false}
                autoComplete="email"
              />
            </View>
            {touched && errors.email ? (
              <Text className="text-red-500 text-sm">{errors.email}</Text>
            ) : null}
          </View>
        </ScrollView>
        <View className="absolute bottom-5 px-6 w-full">
          <View className="w-full items-center">
            <CustomTouchableOpacityButton
              className={`h-[56px] w-full items-center justify-center bg-primary rounded-[100px] ${
                isDisabled() ? 'opacity-30' : 'opacity-100'
              }`}
              title="Send code"
              textClassName="text-white text-[17px] font-semibold"
              disabled={isDisabled()}
              onPress={handleForgotPassword}
              isLoading={isLoading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </CustomSafeAreaView>
  );
};
