try {
  require('dotenv').config({ quiet: true });
} catch (_e) {
  // Expo loads EXPO_PUBLIC_ env vars automatically
}

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    name: 'Pide ya',
    slug: 'pide-ya',
    version: '1.2.1',
    jsEngine: 'hermes',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    scheme: 'pideya',
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
      'expo-web-browser',
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.movidatci.pideya',
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
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/adaptive-icon.png',
      },
      package: 'com.movidatci.pideya',
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_KEY,
        },
      },
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'INTERNET'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'db0d6965-cc3c-4c5f-bb2e-ef3058b3fde7',
      },
    },
    owner: 'pideya1',
  },
};
