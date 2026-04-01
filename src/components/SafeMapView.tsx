import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let PROVIDER: any = null;

try {
  const Maps = require('react-native-maps');
  MapViewComponent = Maps.default;
  MarkerComponent = Maps.Marker;
  PROVIDER = Maps.PROVIDER_GOOGLE;
} catch {
  // react-native-maps not available (Expo Go)
}

export const isMapsAvailable = !!MapViewComponent;

/**
 * MapView wrapper that falls back to a placeholder in Expo Go.
 */
export const SafeMapView = React.forwardRef<any, any>(
  ({ children, style, fallbackText, ...props }, ref) => {
    if (!MapViewComponent) {
      return (
        <View style={[styles.fallback, style]}>
          <Text style={styles.fallbackIcon}>📍</Text>
          <Text style={styles.fallbackText}>
            {fallbackText || 'Mapa no disponible en Expo Go'}
          </Text>
          <Text style={styles.fallbackHint}>
            Usa un development build para ver el mapa
          </Text>
        </View>
      );
    }

    return (
      <MapViewComponent
        ref={ref}
        provider={PROVIDER}
        style={style}
        {...props}
      >
        {children}
      </MapViewComponent>
    );
  },
);

SafeMapView.displayName = 'SafeMapView';

/**
 * Marker wrapper — renders nothing if maps unavailable.
 */
export const SafeMarker: React.FC<any> = ({ children, ...props }) => {
  if (!MarkerComponent) return null;
  return <MarkerComponent {...props}>{children}</MarkerComponent>;
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
