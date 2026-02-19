import { Ionicons } from '@expo/vector-icons';
import { useMixpanel } from '@macro-meals/mixpanel';
import { useRemoteConfigContext } from '@macro-meals/remote-config-service';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Config from 'react-native-config';
import EditableAvatar from 'src/components/EditableAvatar';
import ProfileSection from 'src/components/ProfileSection';
import SectionItem from 'src/components/SectionItem';
import { useGoalsFlowStore } from 'src/store/goalsFlowStore';
import { appConstants } from '../../constants/appConstants';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import useStore from '../store/useStore';
import { RootStackParamList } from '../types/navigation';
import ContactSupportDrawer from './ContactSupportDrawer';
import { usePosthog } from '@macro-meals/posthog_service/src';

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Settings screen for the application.
 * Displays user profile, macro targets, and app settings.
 */
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const preferences = useStore(state => state.preferences);
  const token = useStore(state => state.token);
  // const updatePreferences = useStore((state) => state.updatePreferences);
  const setAuthenticated = useStore(state => state.setAuthenticated);
  const { getValue } = useRemoteConfigContext();
  const [showDrawer, setShowDrawer] = useState(false);
  const mixpanel = useMixpanel();
  const eventsFired = useRef(false);
  const _devMode = getValue('dev_mode').asBoolean();
  const posthog =  usePosthog()

  // Local state for settings
  const [_units, setUnits] = useState<string>('g/kcal');
  // const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [userData, setUserData] = useState({
    age: 0,
    avatar_url: '',
    created_at: '',
    display_name: '',
    dob: '',
    email: '',
    fcm_token: '',
    first_name: '',
    has_macros: false,
    height: 0,
    id: '',
    is_active: true,
    is_pro: false,
    last_name: '',
    meal_reminder_preferences_set: false,
    sex: '',
    unit_preference: 'metric',
    updated_at: '',
  });

  // Modal state for units selection
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [tempUnitPreference, setTempUnitPreference] = useState('metric');

  /**
   * Fetch user data on component mount
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profileData = await userService.fetchUserData();
        setUserData(profileData);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Handle error appropriately
      }
    };
    fetchUserData();

    if (preferences.unitSystem) {
      setUnits(preferences.unitSystem === 'Metric' ? 'g/kcal' : 'oz/cal');
    }
  }, [token]);

  /**
   * Consolidated mixpanel tracking - fire only once
   */
  useEffect(() => {
    if (userData.id && mixpanel && !eventsFired.current) {
      eventsFired.current = true;

      mixpanel.track({
        name: 'profile_screen_viewed',
        properties: {
          user_id: userData.id,
          email: userData.email,
          is_pro: userData.is_pro,
          entry_point: 'app_tab',
        },
      });
       posthog.track({
        name: 'profile_screen_viewed',
        properties: {
              $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
          user_id: userData.id,
          email: userData.email,
          is_pro: userData.is_pro,
          entry_point: 'app_tab',
          platform:Platform.OS
        },
      });
    }
  }, [userData.id, mixpanel, posthog]);

  /**
   * Handle unit preference change using the same pattern as account settings
   */
  const handleUnitPreferenceChange = async (value: string) => {
    try {
      const updated = await userService.updateProfile({
        unit_preference: value,
      });
      setUserData(prev => ({ ...prev, ...updated }));

      // Update Mixpanel user properties
      mixpanel?.setUserProperties({
        unit_preference: value,
      });

      // Track unit preference change
      mixpanel?.track({
        name: 'unit_preference_changed',
        properties: {
          new_unit_preference: value,
          previous_unit_preference: userData.unit_preference,
        },
      });

         posthog?.track({
        name: 'unit_preference_changed',
        properties: {
            $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
          new_unit_preference: value,
          previous_unit_preference: userData.unit_preference,
        },
      });
      
      

      setShowUnitsModal(false);
    } catch (error) {
      console.error('Error updating unit preference:', error);
      // Optionally show error to user
    }
  };

  /**
   * Handle dark mode toggle
   * @param value - The new dark mode state
   */
  // const handleDarkModeToggle = (value: boolean) => {
  //     setIsDarkMode(value);
  //     // In a real app, you would update a theme context or store
  // };

  /**
   * Handle going back to the previous screen
   */
  // const handleGoBack = () => {
  //   navigation.goBack();
  // };

  /**
   * Handle logout action
   */
  const handleLogout = async () => {
     posthog?.track({
                name: 'logout_clicked',
                properties: {
                    $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
                  user_id: userData.id,
                  email: userData.email,
                  entry_point:'settings_screen',
                  session_duration_minutes: userData.created_at
                    ? Math.floor(
                        (Date.now() - new Date(userData.created_at).getTime()) /
                          (1000 * 60)
                      )
                    : 0,
                },
              });
    Alert.alert(
      'Are you sure you want to log out?',
      '',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Track logout in Mixpanel
              mixpanel?.track({
                name: 'user_logged_out',
                properties: {
                  user_id: userData.id,
                  email: userData.email,
                  session_duration_minutes: userData.created_at
                    ? Math.floor(
                        (Date.now() - new Date(userData.created_at).getTime()) /
                          (1000 * 60)
                      )
                    : 0,
                },
              });
             

              await authService.logout();
              setAuthenticated(false, '', '');
              // navigation.reset({
              //   index: 0,
              //   routes: [{ name: "Login" }],
              // });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  /**
   * Handle navigation to help screen
   */
  const handleHelpSupport = () => {
    mixpanel?.track({
      name: 'contact_support_clicked',
      properties: {
        // Add user_id/email if available
      },
    });
     posthog?.track({
      name: 'contact_support_clicked',
      properties: {
          $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
       entry_point:'settings_screen'
      },
    });
    setShowDrawer(true);
  };

  // const handleModalSheet = () => {
  //   navigation.navigate("PaymentScreen" as never);
  // };
  const openEmail = () => {
    mixpanel?.track({
      name: 'submit_feedback_email_opened',
      properties: {},
    });
      posthog?.track({
      name: 'submit_feedback_email_opened',
      properties: {
          $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
      },
    });

    const { email } = appConstants();

    let url = `mailto:${email.to}`;
    const subject = `?subject=${encodeURIComponent(email.subject)}`;
    const body = `&body=${encodeURIComponent(email.body)}`;
    url += subject + body;
    Linking.openURL(url).catch(err =>
      console.error('Error opening email', err)
    );
  };

  /**
   * Handle navigation to feedback screen
   */
  const _handleSendFeedback = () => {
    // Navigate to feedback screen
    Alert.alert('Feedback ', 'Feedback coming soon!');

    // navigation.navigate('SendFeedback' as never);
  };

  const handleHealthGuidelines = () => {
    navigation.navigate('HealthGuidelinesScreen' as never);
  };

  return (
    <CustomSafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ backgroundColor: '#f8f8f8' }}>
        {/* Header with back button and title */}
        {/* <View className="flex-row items-center p-4 border-b border-b-gray-200">
          <TouchableOpacity
            className="mr-4"
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-bold">Settings</Text>
        </View> */}

        {/* --- Hardcoded Profile Header Start --- */}
        <View
          className={`bg-white ${Platform.OS === 'ios' ? 'pt-8' : 'pt-3'} px-5`}
        >
          <Text className="text-3xl font-bold mt-1.5 mb-4 text-[#333]">
            Profile
          </Text>
          <View className="bg-white flex-row items-center mb-1">
            <EditableAvatar size={70} style={{ marginRight: 16 }} />
            <View className="flex-1 justify-center">
              <Text className="text-lg font-medium text-[#333] mb-1">
                {userData?.first_name || userData?.email}
              </Text>
              <Text className="text-base text-[#666]">
                {userData?.age} years old
              </Text>
            </View>
          </View>
        </View>
        {/* --- Hardcoded Profile Header End --- */}

        {/* Personal Section */}
        <ProfileSection title="PERSONAL">
          <SectionItem
            title="Account settings"
            image={IMAGE_CONSTANTS.personIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              navigation.navigate('AccountSettingsScreen');
            }}
          />
          <SectionItem
            title="Adjust targets"
            image={IMAGE_CONSTANTS.fireIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {

              navigation.navigate('AdjustTargets');
              posthog.track({
                name:'adjust_goals_entry_clicked',
                properties:{
                  entry_point:'setting_screen',
                    $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
                }
              })
            }}
          />
          <SectionItem
            title="Adjust goals"
            image={IMAGE_CONSTANTS.fireIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              useGoalsFlowStore.getState().resetToHeightMetrics();
              navigation.navigate('AdjustGoalsFlow');
            }}
          />
          <SectionItem
            title="Password"
            image={IMAGE_CONSTANTS.lockIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              navigation.navigate('ResetPasswordRequest');
            }}
          />
        </ProfileSection>

        {/* Account Section */}
        <ProfileSection title="ACCOUNT">
          <SectionItem
            title="Account type"
            image={IMAGE_CONSTANTS.accountTypeIcon}
            rightComponent={
              <View className="flex-row items-center">
                <Text className="text-md text-[#FFC008]  mx-2">Premium</Text>
              </View>
            }
            onPress={() => {}}
          />
          {Config.ENVIRONMENT !== 'production' ? (
            <SectionItem
              title="Payment"
              image={IMAGE_CONSTANTS.restoreIcon}
              rightComponent={
                <Text className="text-xl text-gray-400 ml-1">›</Text>
              }
              onPress={() => {
                navigation.navigate('PaymentScreen');
              }}
            />
          ) : (
            <></>
          )}

          <SectionItem
            title="Manage Subscription"
            image={IMAGE_CONSTANTS.restoreIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              navigation.navigate('ManageSubscriptionsScreen');
            }}
          />
          <SectionItem
            title="Redeem referral code"
            image={IMAGE_CONSTANTS.chatIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              mixpanel?.track({
                name: 'redeem_referral_code_clicked',
                properties: {
                  source: 'settings_screen',
                },
              });
              navigation.navigate('RedeemReferralCodeScreen');
            }}
          />
        </ProfileSection>

        {/* Notifications Section */}
        <ProfileSection title="NOTIFICATIONS">
          <SectionItem
            title="Notifications"
            image={IMAGE_CONSTANTS.notificationIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => navigation.navigate('Notifications')}
          />
        </ProfileSection>

        {/* Help and Support Section */}
        <ProfileSection title="HELP & SUPPORT">
          <SectionItem
            title="Contact support"
            image={IMAGE_CONSTANTS.supportAgentIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={handleHelpSupport}
          />
          <SectionItem
            title="Submit feedback"
            image={IMAGE_CONSTANTS.chatIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              mixpanel?.track({
                name: 'submit_feedback_clicked',
                properties: {},
              });
              posthog?.track({
                name: 'submit_feedback_clicked',
                properties: {
                    $screen_name: 'SettingsScreen',
            $current_url: 'SettingsScreen',
                },
              });
              openEmail();
            }}
          />
          <SectionItem
            title="Health guidelines"
            image={IMAGE_CONSTANTS.infoIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              handleHealthGuidelines();
            }}
          />
          <SectionItem
            title="Knowledge base"
            image={IMAGE_CONSTANTS.knowledgeIcon}
            rightComponent={
              <View className="flex-row items-center bg-[#01675B33] rounded-lg">
                <Text className="text-sm text-[#01675B]  p-2 mx-2">
                  Coming Soon
                </Text>
              </View>
            }
            onPress={() => {}}
          />
        </ProfileSection>

        {/* General Section */}
        <ProfileSection title="GENERAL">
          <SectionItem
            title="Terms of Service"
            image={IMAGE_CONSTANTS.fileIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => navigation.navigate('TermsOfServiceScreen')}
          />
          <SectionItem
            title="Privacy Policy"
            image={IMAGE_CONSTANTS.fileIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SectionItem
            title="About"
            image={IMAGE_CONSTANTS.infoIcon}
            rightComponent={
              <Text className="text-xl text-gray-400 ml-1">›</Text>
            }
            onPress={() => {
              navigation.navigate('About');
            }}
          />
        </ProfileSection>

        <TouchableOpacity
          className="border border-red-500 rounded-full py-3 items-center bg-transparent my-8 mx-5  "
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <Ionicons
              name="exit-outline"
              size={20}
              color="#ef4444"
              className="mr-2"
            />
            <Text className="text-red-500 text-base font-semibold">
              Log Out
            </Text>
          </View>
        </TouchableOpacity>

        {/* Units Selection Modal */}
        <Modal
          visible={showUnitsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUnitsModal(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-xl p-4">
              <Text className="text-center text-base font-semibold mb-2">
                Select Unit System
              </Text>
              <Picker
                selectedValue={tempUnitPreference}
                onValueChange={setTempUnitPreference}
                style={{ width: '100%' }}
                itemStyle={{ fontSize: 18, height: 180 }}
              >
                <Picker.Item label="Metric" value="metric" />
                <Picker.Item label="Imperial" value="imperial" />
              </Picker>
              <View className="flex-row justify-between mt-4">
                <TouchableOpacity
                  onPress={() => setShowUnitsModal(false)}
                  className="flex-1 items-center py-2"
                >
                  <Text className="text-lg text-blue-500">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleUnitPreferenceChange(tempUnitPreference)}
                  className="flex-1 items-center py-2"
                >
                  <Text className="text-lg text-blue-500">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showDrawer}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDrawer(false)}
        >
          <ContactSupportDrawer onClose={() => setShowDrawer(false)} />
        </Modal>
      </ScrollView>
    </CustomSafeAreaView>
  );
};

export default SettingsScreen;
