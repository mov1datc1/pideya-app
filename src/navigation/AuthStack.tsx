import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TokenLoginScreen from '../screens/auth/TokenLoginScreen';
import PhoneVerifyScreen from '../screens/auth/PhoneVerifyScreen';
import { colors } from '../constants/theme';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="TokenLogin" component={TokenLoginScreen} />
      <Stack.Screen
        name="PhoneVerify"
        component={PhoneVerifyScreen}
        options={{
          headerShown: true,
          headerTitle: 'Verificar teléfono',
          headerTintColor: colors.textPrimary,
          headerStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack.Navigator>
  );
}
