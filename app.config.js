/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    name: 'Pide ya',
    slug: 'pide-ya',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#2D8B7A',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Pide ya necesita tu ubicacion para mostrarte restaurantes cercanos y entregar tu pedido.',
          locationWhenInUsePermission:
            'Pide ya necesita tu ubicacion para mostrarte restaurantes cercanos y entregar tu pedido.',
        },
      ],
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.pideya.app',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Pide ya necesita tu ubicacion para mostrarte restaurantes cercanos y entregar tu pedido.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#2D8B7A',
        foregroundImage: './assets/adaptive-icon.png',
      },
      package: 'com.pideya.app',
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_KEY,
        },
      },
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
  },
};
