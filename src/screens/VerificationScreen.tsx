import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { authService } from "../services/authService";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
import CustomTouchableOpacityButton from "../components/CustomTouchableOpacityButton";
import BackButton from "../components/BackButton";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { useMixpanel } from "@macro-meals/mixpanel/src";
import { usePosthog } from "@macro-meals/posthog_service/src";

type VerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VerificationScreen"
>;

export const VerificationScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const navigation = useNavigation<VerificationScreenNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "VerificationScreen">>();
  const { email: routeEmail, source } = route.params;

  const mixpanel = useMixpanel();
    const posthog = usePosthog();

  const eventsFired = useRef(false);

  useEffect(() => {
    if (mixpanel && !eventsFired.current) {
      eventsFired.current = true;
      mixpanel.track({
        name: "password_verification_screen_viewed",
        properties: { platform: Platform.OS },
      });
    }
    if (posthog && !eventsFired.current) {
      eventsFired.current = true;
      posthog.track({
        name: "password_verification_screen_viewed",
        properties: { platform: Platform.OS },
      });
    }
  }, [mixpanel, posthog]);

  const isDisabled = () => {
    return isLoading || !routeEmail || !/\S+@\S+\.\S+/.test(routeEmail);
  };

  const CELL_COUNT = 6;
  const [value, setValue] = useState("");
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [error, setError] = useState("");
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [countdown]);

  const handleVerifyCode = async () => {
    if (!routeEmail) {
      Alert.alert(
        "Error",
        "Please enter the email associated with your account"
      );
      return;
    }
    mixpanel?.track({
      name: "password_verification_submitted",
      properties: {
        email_domain: routeEmail.split("@")[1] || "",
        platform: Platform.OS,
      },
    });
    posthog?.track({
      name: "password_verification_submitted",
      properties: {
        email_domain: routeEmail.split("@")[1] || "",
        platform: Platform.OS,
      },
    });

    setIsLoading(true);
    const params = {
      email: routeEmail,
      otp: value,
    };
    console.log("The verification params are", value);
    try {
      const data = await authService.verifyCode(params);
      console.log("data", data);
      const session_token = data.session_token;
      console.log("The session token is", session_token);
      if (session_token) {
        mixpanel?.track({
          name: "password_verification_successful",
          properties: {
            email_domain: routeEmail.split("@")[1] || "",
            platform: Platform.OS,
          },
        });
         posthog?.track({
          name: "password_verification_successful",
          properties: {
            email_domain: routeEmail.split("@")[1] || "",
            platform: Platform.OS,
          },
        });
        navigation.navigate("ResetPassword", {
          email: routeEmail,
          session_token: session_token,
          otp: value, // Pass the OTP code
          source,
        });
      } else {
        Alert.alert("Error", "Invalid verification code");
      }
    } catch (error) {
      mixpanel?.track({
        name: "password_verification_failed",
        properties: {
          email_domain: routeEmail.split("@")[1] || "",
          error_type: error instanceof Error ? error.message : "unknown_error",
          platform: Platform.OS,
        },
      });
        posthog?.track({
        name: "password_verification_failed",
        properties: {
          email_domain: routeEmail.split("@")[1] || "",
          error_type: error instanceof Error ? error.message : "unknown_error",
          platform: Platform.OS,
        },
      });
      setError(
        error instanceof Error
          ? `${error.message}: Code does not exist. Please try again`
          : "Code does not exist. Please try again"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    mixpanel?.track({
      name: "password_verification_resend_requested",
      properties: { platform: Platform.OS },
    });

    posthog?.track({
      name: "password_verification_resend_requested",
      properties: { platform: Platform.OS },
    });

    setIsLoading(true);
    try {
      await authService.forgotPassword(routeEmail);
      setCountdown(60);
      setCanResend(false);
      Alert.alert("Success", "Verification code has been resent");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to resend code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomSafeAreaView
      className="flex-1 items-start justify-start"
      edges={["left", "right"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView className="flex-1 relative align-left p-6">
          <View className="flex-row items-center justify-start mb-3">
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <Text className="text-3xl font-medium text-black mb-2">
            Enter verification code
          </Text>
          <Text className="text-[18px] font-normal text-textMediumGrey mb-8 leading-7">
            We've sent a 6-digit code to {routeEmail}
          </Text>

          <View className="w-full mb-5">
            <View className="flex-col">
              <CodeField
                ref={ref}
                {...props}
                value={value}
                onChangeText={setValue}
                cellCount={CELL_COUNT}
                rootStyle={{
                  marginTop: 20,
                  marginBottom: 20,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
                keyboardType="number-pad"
                renderCell={({ index, symbol, isFocused }) => (
                  <Text
                    key={index}
                    className={`w-[50px] h-[56px] border-2 border-gray-300 rounded justify-center items-center text-2xl bg-white text-center ${
                      isFocused ? "border-[#19a28f]" : ""
                    }`}
                    style={{ lineHeight: 56 }}
                    onLayout={getCellOnLayoutHandler(index)}
                  >
                    {symbol || (isFocused ? <Cursor /> : null)}
                  </Text>
                )}
              />
              {error ? (
                <Text className="text-red-500 text-sm">{error}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
        <View className="absolute flex-col bottom-10 px-6 w-full">
          <View className="w-full items-center">
            <CustomTouchableOpacityButton
              className={`h-[56px] w-full items-center justify-center bg-primary rounded-[100px] ${
                isDisabled() ? "opacity-30" : "opacity-100"
              }`}
              title="Verify code"
              textClassName="text-white text-[17px] font-semibold"
              disabled={
                isLoading || !routeEmail || !/\S+@\S+\.\S+/.test(routeEmail)
              }
              onPress={handleVerifyCode}
              isLoading={isLoading}
            />
          </View>
          <View className="mt-2 items-center">
            {!canResend ? (
              <Text className="text-textMediumGrey">
                Resend code in {countdown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                <Text className="text-primary font-semibold">Resend code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </CustomSafeAreaView>
  );
};
