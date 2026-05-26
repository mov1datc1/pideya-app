import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { BottomTabs } from './BottomTabs';
import { RestaurantDetailScreen } from '../screens/main/RestaurantDetailScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { CheckoutScreen } from '../screens/main/CheckoutScreen';
import { OrderStatusScreen } from '../screens/main/OrderStatusScreen';
import { AddressPickerScreen } from '../screens/main/AddressPickerScreen';
import { CompleteProfileScreen } from '../screens/auth/CompleteProfileScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types/navigation';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@pideya_has_seen_onboarding_v2').then((val) => {
      setHasSeenOnboarding(val === 'true');
    });
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('@pideya_has_seen_onboarding_v2', 'true');
    setHasSeenOnboarding(true);
  };

  // While loading or checking onboarding, show Auth (which has the Splash)
  if (loading || hasSeenOnboarding === null) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={AuthStack} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  // Show onboarding to all users if they haven't seen it yet
  if (!hasSeenOnboarding) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen 
            name="Onboarding" 
            component={OnboardingScreen} 
            initialParams={{ onComplete: completeOnboarding }} 
          />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          isProfileComplete ? (
            <>
              <RootStack.Screen name="Main" component={BottomTabs} />
              <RootStack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
              <RootStack.Screen name="Cart" component={CartScreen} />
              <RootStack.Screen name="Checkout" component={CheckoutScreen} />
              <RootStack.Screen name="OrderStatus" component={OrderStatusScreen} />
              <RootStack.Screen
                name="AddressPicker"
                component={AddressPickerScreen}
                options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
              />
            </>
          ) : (
            <RootStack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
