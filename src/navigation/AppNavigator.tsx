import React from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList } from '../types/navigation';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();

  // While loading, show Auth (which has the Splash)
  if (loading) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={AuthStack} />
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
            <RootStack.Screen name="Auth" component={AuthStack} />
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
