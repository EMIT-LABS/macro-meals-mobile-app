import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import AddMeal from 'src/screens/AddMeal';
import ProgressScreen from 'src/screens/ProgressScreen';

const Tab = createBottomTabNavigator();

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  return (
    <View className="flex-row items-center justify-between bg-white h-[90px] px-4 pb-6">
      {state.routes.map((route, index) => {
        //const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const icon = [
          IMAGE_CONSTANTS.dashboardIcon,
          IMAGE_CONSTANTS.mealsIcon,
          IMAGE_CONSTANTS.progressIcon,
          IMAGE_CONSTANTS.profileIcon,
        ][index];

        const label = ['Dashboard', 'Meals', 'Progress', 'Profile'][index];

        if (index === 1) {
          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity
                onPress={() => navigation.navigate(route.name)}
                className="flex-1 items-center justify-center pr-8"
              >
                <Image
                  source={icon}
                  className="w-6 h-6 mb-1"
                  tintColor={isFocused ? '#009688' : '#000'}
                />
                <Text
                  allowFontScaling={false}
                  className={`text-xs font-normal ${
                    isFocused ? 'text-primaryLight' : 'text-black'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: 'ScanScreenType',
                    })
                  );
                }}
                className="w-[36px] h-[36px] items-center justify-center"
              >
                <Image
                  source={IMAGE_CONSTANTS.fabIcon}
                  className="w-[37px] h-[37px]"
                />
              </TouchableOpacity>
            </React.Fragment>
          );
        }

        if (index === 2) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              className="flex-1 items-center justify-center pl-8"
            >
              <Image
                source={icon}
                className="w-6 h-6 mb-1"
                tintColor={isFocused ? '#009688' : '#000'}
              />
              <Text
                allowFontScaling={false}
                className={`text-xs font-normal ${
                  isFocused ? 'text-primaryLight' : 'text-black'
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="flex-1 items-center justify-center"
          >
            <Image
              source={icon}
              className="w-6 h-6 mb-1"
              tintColor={isFocused ? '#009688' : '#000'}
            />
            <Text
              allowFontScaling={false}
              className={`text-xs font-normal ${
                isFocused ? 'text-primaryLight' : 'text-black'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const CustomBottomTabs = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Meals" component={AddMeal} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default CustomBottomTabs;
