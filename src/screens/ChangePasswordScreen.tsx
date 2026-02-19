import { MaterialIcons } from '@expo/vector-icons';
import { useMixpanel } from '@macro-meals/mixpanel/src';
import { usePosthog } from '@macro-meals/posthog_service/src';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from 'src/types/navigation';
import BackButton from '../components/BackButton';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { authService } from '../services/authService';

type ChangePasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChangePassword'
>;

/**
 * Forgot-password flow (from Login): after OTP verification.
 * Two fields only: new password, confirm. POST /auth/change-password (v2, no Bearer).
 */
export const ChangePasswordScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ChangePassword'>>();
  const { email: routeEmail, session_token: routeSessionToken } = route.params;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const navigation = useNavigation<ChangePasswordScreenNavigationProp>();
  const mixpanel = useMixpanel();
  const posthog = usePosthog();
  const screenViewedTracked = useRef(false);

  React.useEffect(() => {
    if (screenViewedTracked.current) return;
    screenViewedTracked.current = true;
    mixpanel?.track({
      name: 'change_password_screen_viewed',
      properties: { platform: Platform.OS },
    });
    posthog?.track({
      name: 'change_password_screen_viewed',
      properties: {
        platform: Platform.OS,
        $screen_name: 'ChangePassword',
        $current_url: 'ChangePassword',
      },
    });
  }, [mixpanel, posthog]);

  const { errors, isValid } = useMemo(() => {
    const e = { password: '', confirmPassword: '' };
    let valid = true;
    if (!password) {
      e.password = 'Password is required';
      valid = false;
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters';
      valid = false;
    }
    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (confirmPassword !== password) {
      e.confirmPassword = 'Passwords do not match';
      valid = false;
    }
    return { errors: e, isValid: valid };
  }, [password, confirmPassword]);

  const handleChangePassword = async () => {
    mixpanel?.track({
      name: 'change_password_attempted',
      properties: {
        email_domain: routeEmail?.split('@')[1] || '',
        platform: Platform.OS,
      },
    });
    posthog?.track({
      name: 'change_password_attempted',
      properties: {
        $screen_name: 'ChangePassword',
        $current_url: 'ChangePassword',
        email_domain: routeEmail?.split('@')[1] || '',
        platform: Platform.OS,
      },
    });
    setIsLoading(true);

    try {
      await authService.changePasswordFromForgot({
        email: routeEmail,
        session_token: routeSessionToken,
        password,
      });
      mixpanel?.track({
        name: 'change_password_successful',
        properties: {
          email_domain: routeEmail?.split('@')[1] || '',
          platform: Platform.OS,
        },
      });
      posthog?.track({
        name: 'change_password_successful',
        properties: {
          $screen_name: 'ChangePassword',
          $current_url: 'ChangePassword',
          email_domain: routeEmail?.split('@')[1] || '',
          platform: Platform.OS,
        },
      });
      Alert.alert(
        'Password changed',
        'You can now sign in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
      );
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : error?.message || 'Failed to change password. Please try again.';
      mixpanel?.track({
        name: 'change_password_failed',
        properties: {
          email_domain: routeEmail?.split('@')[1] || '',
          error_type: message,
          platform: Platform.OS,
        },
      });
      posthog?.track({
        name: 'change_password_failed',
        properties: {
          $screen_name: 'ChangePassword',
          $current_url: 'ChangePassword',
          email_domain: routeEmail?.split('@')[1] || '',
          error_type: message,
          platform: Platform.OS,
        },
      });
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 0,
            paddingBottom: 24,
          }}
        >
          <View className="flex-row items-center justify-start mb-3">
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <Text className="text-3xl font-medium text-black mb-2 text-left">
            Change password
          </Text>
          <Text className="text-base text-textMediumGrey mb-6">
            Enter your new password below.
          </Text>

          <View className="mb-4">
            <View
              className={`relative mb-2 ${
                touched.password && errors.password
                  ? 'border border-[#ff6b6b] rounded-md'
                  : ''
              }`}
            >
              <TextInput
                className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                placeholder="New password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (!touched.password)
                    setTouched(t => ({ ...t, password: true }));
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                className="absolute right-4 bottom-[30%]"
              >
                <Image
                  source={
                    showPassword
                      ? require('../../assets/visibility-on-icon.png')
                      : require('../../assets/visibility-off-icon.png')
                  }
                  className="w-6 h-6 ml-2"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {touched.password && errors.password ? (
              <Text className="text-[#ff6b6b] text-sm mb-2">
                {errors.password}
              </Text>
            ) : null}
          </View>

          <View className="mb-4">
            <View
              className={`relative mb-2 ${
                touched.confirmPassword && errors.confirmPassword
                  ? 'border border-[#ff6b6b] rounded-md'
                  : ''
              }`}
            >
              <TextInput
                className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (!touched.confirmPassword)
                    setTouched(t => ({ ...t, confirmPassword: true }));
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(v => !v)}
                className="absolute right-4 bottom-[30%]"
              >
                <Image
                  source={
                    showConfirmPassword
                      ? require('../../assets/visibility-on-icon.png')
                      : require('../../assets/visibility-off-icon.png')
                  }
                  className="w-6 h-6 ml-2"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {touched.confirmPassword && errors.confirmPassword ? (
              <Text className="text-[#ff6b6b] text-sm mb-2">
                {errors.confirmPassword}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-start mt-2 w-full mb-24">
            <View
              className={`w-[20px] h-[20px] rounded-full justify-center items-center mr-2 ${
                password.length >= 8 ? 'bg-primary' : 'bg-lightGrey'
              }`}
            >
              <MaterialIcons name="check" size={16} color="white" />
            </View>
            <Text className="text-sm font-normal text-textMediumGrey">
              Password must be at least 8 characters
            </Text>
          </View>

          <View className="absolute bottom-2 left-0 right-0 px-4">
            <View className="w-full items-center">
              <CustomTouchableOpacityButton
                className="h-[56px] w-full items-center justify-center bg-primary rounded-[100px]"
                title="Change password"
                textClassName="text-white text-[17px] font-semibold"
                disabled={isLoading || !isValid}
                onPress={handleChangePassword}
                isLoading={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CustomSafeAreaView>
  );
};
