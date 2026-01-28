// src/screens/WelcomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomSafeAreaView from '../components/CustomSafeAreaView';
import CustomTouchableOpacityButton from '../components/CustomTouchableOpacityButton';
import { IMAGE_CONSTANTS } from '../constants/imageConstants';
import { usePosthog } from '@macro-meals/posthog_service/src';





export const WelcomeScreen: React.FC = () => {
    const posthog = usePosthog()
    const navigation = useNavigation<any>();

    const handleGetStarted = () => {
        navigation.navigate('SignupScreen');
        posthog.track({
            name:'get_started_clicked',
            properties:{
                platform:Platform.OS
            }
        })
    };

    const handleLogin = () => {
        navigation.navigate('LoginScreen');
         posthog.track({
            name:'sign_in_clicked',
            properties:{
                platform:Platform.OS
            }
        })
    };

    return (
        <CustomSafeAreaView className='flex-1' edges={['left', 'right']}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Image source={IMAGE_CONSTANTS.strawberryBg}/>
                    
                    <Text style={styles.title}>Welcome to MacroMate</Text>
                    <Text style={styles.subtitle}>
                        Track your macros, achieve your goals, and transform your nutrition journey.
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <CustomTouchableOpacityButton
                        className='h-[56px] w-full items-center justify-center bg-primary rounded-[100px] mb-4'
                        title="Get Started"
                        textClassName='text-white text-[17px] font-semibold'
                        onPress={handleGetStarted}
                    />
                    <CustomTouchableOpacityButton
                        className='h-[56px] w-full items-center justify-center bg-white border border-primary rounded-[100px]'
                        title="I already have an account"
                        textClassName='text-primary text-[17px] font-semibold'
                        onPress={handleLogin}
                    />
                </View>
            </View>
        </CustomSafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#202030',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        marginBottom: 24,
    },
});