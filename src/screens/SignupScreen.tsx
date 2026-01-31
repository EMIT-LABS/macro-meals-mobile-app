import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../services/authService';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import BackButton from '../components/BackButton';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { useMixpanel } from '@macro-meals/mixpanel';
import DeviceInfo from 'react-native-device-info';
import { usePosthog } from '@macro-meals/posthog_service/src';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignupScreen'
>;

export const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const mixpanel = useMixpanel();
  const posthog = usePosthog();

  const [errors, setErrors] = useState({
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    terms: '',
  });

  useEffect(() => {
    if (mixpanel) {
      mixpanel.track({
        name: 'signup_screen_viewed',
        properties: {
          platform: Platform.OS,
          app_version: DeviceInfo.getVersion(),
        },
      });
    }
    posthog.track({
      name: 'signup_screen_viewed',
      properties: {
        $screen_name: 'SignUpscreen',
        $current_url: 'SignUpscreen',
        platform: Platform.OS,
        app_version: DeviceInfo.getVersion(),
      },
    });
  }, []);

  const navigation = useNavigation<NavigationProp>();

  const validateForm = () => {
    let isValid = true;

    const newErrors = {
      email: '',
      nickname: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
      terms: '',
    };

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.(com|org|net)$/.test(email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    // if (nickname && nickname.length > 30) {
    //     newErrors.nickname = 'Nickname must be less than 30 characters';
    //     isValid = false;
    // }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // if (!confirmPassword) {
    //     newErrors.confirmPassword = 'Please confirm your password';
    //     isValid = false;
    // } else if (confirmPassword !== password) {
    //     newErrors.confirmPassword = 'Passwords do not match';
    //     isValid = false;
    // }

    // if (!agreedToTerms) {
    //     newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    //     isValid = false;
    // }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }
    //tracking signup attempt
    if (mixpanel) {
      mixpanel.track({
        name: 'signup_attempted',
        properties: {
          $screen_name: 'SignUpscreen',
          $current_url: 'SignUpscreen',
          email_domain: email.split('@')[1] || '',
          has_referral_code: !!referralCode.trim(),
          platform: Platform.OS,
        },
      });
    }

    if (posthog) {
      posthog.track({
        name: 'signup_attempted',
        properties: {
          $screen_name: 'SignUpscreen',
          $current_url: 'SignUpscreen',
          email_domain: email.split('@')[1] || '',
          has_referral_code: !!referralCode.trim(),
          platform: Platform.OS,
        },
      });
    }

    setIsLoading(true);

    try {
      const signUpTime = new Date().toISOString();
      // user does NOT log in yet
      const signupData: any = {
        email,
        password,
      };

      // Add referral code if provided
      if (referralCode.trim()) {
        signupData.referral_code = referralCode.trim();
      }

      const userId = await authService.signup(signupData);

      if (mixpanel) {
        mixpanel.identify(userId);
        mixpanel.track({
          name: 'signup_successful',
          properties: {
            $screen_name: 'SignUpscreen',
            $current_url: 'SignUpscreen',
            signup_method: 'email',
            platform: Platform.OS,
            signup_time: signUpTime,
            has_referral_code: !!referralCode.trim(),
          },
        });
        mixpanel?.register({ signup_time: signUpTime });
      }

      if (posthog) {
        posthog.identify(userId);
        posthog.track({
          name: 'signup_successful',
          properties: {
            $screen_name: 'SignUpscreen',
            $current_url: 'SignUpscreen',
            signup_method: 'email',
            platform: Platform.OS,
            signup_time: signUpTime,
            has_referral_code: !!referralCode.trim(),
          },
        });
        posthog?.register({ signup_time: signUpTime });
      }

      navigation.navigate('EmailVerificationScreen', {
        email,
        password,
      });
    } catch (error) {
      let errorMessage = 'Failed to create account';

      // Extract error message from Axios error response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;

          // Handle invalid referral code specifically
          if (
            errorMessage.toLowerCase().includes('referral code') ||
            errorMessage.toLowerCase().includes('referral_code')
          ) {
            errorMessage = 'Referral code not found, please check again';
          }
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        if (error.message.includes('email')) {
          errorMessage =
            'This email is already registered. Please use a different email or log in.';
        } else {
          errorMessage = error.message;
        }
      }
      // tracking signup failed
      if (mixpanel) {
        mixpanel.track({
          name: 'signup_failed',
          properties: {
            $screen_name: 'SignUpscreen',
            $current_url: 'SignUpscreen',
            email_domain: email.split('@')[1] || '',
            error_type: errorMessage,
            platform: Platform.OS,
          },
        });
      }

      if (posthog) {
        posthog.track({
          name: 'signup_failed',
          properties: {
            $screen_name: 'SignUpscreen',
            $current_url: 'SignUpscreen',
            email_domain: email.split('@')[1] || '',
            error_type: errorMessage,
            platform: Platform.OS,
          },
        });
      }

      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSafeAreaView className="flex-1" edges={['left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 p-6"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1">
            <View className="flex-row items-center justify-start mb-3">
              <BackButton onPress={() => navigation.navigate('LoginScreen')} />
            </View>

            <Text className="text-3xl font-medium text-black mb-2">
              Begin Macro Tracking
            </Text>
            <Text className="text-[18px] font-normal text-textMediumGrey mb-8 leading-7">
              Enter your details to set up your account and start your tracking
              journey.
            </Text>

            <View className="w-full">
              <View
                className={`${
                  errors.email ? 'border border-red-500 rounded-md' : ''
                }`}
              >
                <TextInput
                  className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    // Validate email on change
                    if (!text) {
                      setErrors(prev => ({
                        ...prev,
                        email: 'Email is required',
                      }));
                    } else if (!/^[^\s@]+@[^\s@]+\.(com|org|net)$/.test(text)) {
                      setErrors(prev => ({
                        ...prev,
                        email: 'Email is invalid',
                      }));
                    } else {
                      setErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  spellCheck={false}
                  autoComplete="email"
                />
              </View>
              {errors.email ? (
                <Text className="text-red-500 text-sm mt-2">
                  {errors.email}
                </Text>
              ) : null}

              <View
                className={`relative mt-6 mb-4 ${
                  errors.password ? 'border border-red-500 rounded-md' : ''
                }`}
              >
                <TextInput
                  className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                  placeholder="Create password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }));
                    }
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
              {errors.password ? (
                <Text className="text-red-500 text-sm mt-2 mb-2">
                  {errors.password}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-start mt-2 w-full">
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

              {/* Referral Code Field */}
              <View className="mt-6">
                <TextInput
                  className="border border-lightGrey text-base rounded-md pl-4 font-normal text-black h-[68px]"
                  placeholder="Referral code (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={referralCode}
                  onChangeText={text => {
                    setReferralCode(text);
                    // Clear referral code error when user types
                    if (errors.referralCode) {
                      setErrors(prev => ({ ...prev, referralCode: '' }));
                    }
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                />
              </View>
              {errors.referralCode ? (
                <Text className="text-red-500 text-sm mt-2">
                  {errors.referralCode}
                </Text>
              ) : null}

              {errors.terms ? (
                <Text className="text-red-500 text-sm mb-3">
                  {errors.terms}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="w-full mt-8">
            <View className="w-full items-center">
              <CustomTouchableOpacityButton
                className={`h-[54px] w-full items-center justify-center bg-primary rounded-[100px] ${
                  isLoading ||
                  !email ||
                  !password ||
                  password.length < 8 ||
                  !/\S+@\S+\.\S+/.test(email)
                    ? 'opacity-50'
                    : ''
                }`}
                title="Sign up"
                textClassName="text-white text-[17px] font-semibold"
                disabled={
                  isLoading ||
                  !email ||
                  !password ||
                  password.length < 8 ||
                  !/\S+@\S+\.\S+/.test(email)
                }
                onPress={handleSignup}
                isLoading={isLoading}
              />
            </View>
            <View className="items-center justify-center px-6 mt-2">
              <Text className="text-[17px] text-center text-gray-600 flex-wrap">
                By signing up, you agree to our{' '}
                <Text
                  className="text-base text-primary font-medium"
                  onPress={() => navigation.navigate('TermsOfServiceScreen')}
                >
                  Terms of Service
                </Text>
                <Text className="text-base font-medium">{' and '}</Text>
                <Text
                  className="text-base text-primary font-medium"
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CustomSafeAreaView>
  );
};
