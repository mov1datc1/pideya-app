import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { TermsScreen } from '../screens/auth/TermsScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { CompleteProfileScreen } from '../screens/auth/CompleteProfileScreen';
import { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
};
