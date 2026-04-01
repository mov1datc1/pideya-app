import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import OrderDetailScreen from '../screens/main/OrderDetailScreen';
import ActiveDeliveryScreen from '../screens/main/ActiveDeliveryScreen';
import { colors, spacing } from '../constants/theme';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <View style={splashStyles.iconCircle}>
        <Ionicons name="bicycle" size={48} color={colors.white} />
      </View>
      <Text style={splashStyles.title}>Pide ya</Text>
      <Text style={splashStyles.subtitle}>Repartidor</Text>
      <ActivityIndicator
        color={colors.white}
        size="large"
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
});

export default function AppNavigator() {
  const { isLoading, isAuthenticated, needsPhoneVerify, driver } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{
                headerShown: true,
                title: 'Detalle del pedido',
                headerTintColor: colors.textPrimary,
              }}
            />
            <Stack.Screen
              name="ActiveDelivery"
              component={ActiveDeliveryScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : needsPhoneVerify && driver ? (
          <Stack.Screen name="Auth">
            {() => (
              <AuthStack
                // @ts-ignore — pass initial route params
                initialParams={{
                  screen: 'PhoneVerify',
                  params: {
                    driverId: driver.id,
                    driverPhone: driver.phone,
                    driverName: driver.name,
                  },
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
