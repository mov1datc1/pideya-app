import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { colors, fonts } from '../theme';
import { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, string> = {
  HomeTab: 'home',
  OrdersTab: 'receipt',
  TrackingTab: 'bicycle',
  ProfileTab: 'person',
};

const tabLabels: Record<keyof MainTabParamList, string> = {
  HomeTab: 'Inicio',
  OrdersTab: 'Pedidos',
  TrackingTab: 'Rastreo',
  ProfileTab: 'Perfil',
};

// Placeholder screens for tabs not yet built
const PlaceholderScreen = () => null;

export const BottomTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabIcons[route.name] as keyof typeof Ionicons.glyphMap}
            size={size}
            color={color}
          />
        ),
        tabBarLabel: tabLabels[route.name],
        tabBarActiveTintColor: colors.agave,
        tabBarInactiveTintColor: colors['ink-hint'],
        tabBarLabelStyle: {
          fontFamily: fonts.outfit.medium,
          fontSize: 11,
        },
        tabBarStyle: {
          borderTopColor: colors.silver,
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="OrdersTab" component={PlaceholderScreen} />
      <Tab.Screen name="TrackingTab" component={PlaceholderScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
