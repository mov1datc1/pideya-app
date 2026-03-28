import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_HEIGHT = 220;

interface Props {
  /** Restaurant coordinates */
  restaurantLat: number | null;
  restaurantLng: number | null;
  restaurantName?: string;
  /** Client (delivery) coordinates */
  clientLat: number;
  clientLng: number;
  /** Driver realtime coordinates */
  driverLat: number | null;
  driverLng: number | null;
  driverName?: string | null;
  /** Order status for conditional display */
  status: string;
}

/** Custom marker view */
const PinMarker = ({
  icon,
  color,
  label,
}: {
  icon: string;
  color: string;
  label?: string;
}) => (
  <View style={markerStyles.container}>
    <View style={[markerStyles.bubble, { backgroundColor: color }]}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.white} />
    </View>
    <View style={[markerStyles.arrow, { borderTopColor: color }]} />
    {label ? <Text style={markerStyles.label} numberOfLines={1}>{label}</Text> : null}
  </View>
);

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 10,
    color: colors.ink,
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    maxWidth: 100,
    textAlign: 'center',
  },
});

/** Driver marker with pulsing dot */
const DriverMarker = ({ name }: { name?: string | null }) => (
  <View style={driverStyles.container}>
    <View style={driverStyles.pulse} />
    <View style={driverStyles.dot}>
      <Ionicons name="bicycle" size={16} color={colors.white} />
    </View>
    {name ? <Text style={markerStyles.label} numberOfLines={1}>{name}</Text> : null}
  </View>
);

const driverStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  pulse: {
    position: 'absolute',
    top: -6,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 139, 122, 0.2)',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});

export const OrderTrackingMap: React.FC<Props> = ({
  restaurantLat,
  restaurantLng,
  restaurantName,
  clientLat,
  clientLng,
  driverLat,
  driverLng,
  driverName,
  status,
}) => {
  const mapRef = useRef<MapView>(null);

  // Build markers array
  const markers = useMemo(() => {
    const m: { id: string; lat: number; lng: number }[] = [];
    if (restaurantLat && restaurantLng) {
      m.push({ id: 'restaurant', lat: restaurantLat, lng: restaurantLng });
    }
    if (clientLat && clientLng && clientLat !== 0) {
      m.push({ id: 'client', lat: clientLat, lng: clientLng });
    }
    if (driverLat && driverLng) {
      m.push({ id: 'driver', lat: driverLat, lng: driverLng });
    }
    return m;
  }, [restaurantLat, restaurantLng, clientLat, clientLng, driverLat, driverLng]);

  // Fit map to all markers
  useEffect(() => {
    if (markers.length === 0 || !mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        markers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [markers]);

  // Animate driver marker
  useEffect(() => {
    if (driverLat && driverLng && mapRef.current && status === 'ON_THE_WAY') {
      // Refit when driver moves
      const allCoords = markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [driverLat, driverLng]);

  const hasCoords = markers.length > 0;
  if (!hasCoords) return null;

  const center: Region = {
    latitude: markers[0].lat,
    longitude: markers[0].lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={center}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {/* Restaurant marker */}
        {restaurantLat && restaurantLng && (
          <Marker
            coordinate={{ latitude: restaurantLat, longitude: restaurantLng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <PinMarker icon="restaurant" color={colors.tierra} label={restaurantName} />
          </Marker>
        )}

        {/* Client marker */}
        {clientLat !== 0 && clientLng !== 0 && (
          <Marker
            coordinate={{ latitude: clientLat, longitude: clientLng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <PinMarker icon="home" color={colors.agave} label="Tu" />
          </Marker>
        )}

        {/* Driver marker (realtime) */}
        {driverLat && driverLng && (
          <Marker
            coordinate={{ latitude: driverLat, longitude: driverLng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <DriverMarker name={driverName} />
          </Marker>
        )}
      </MapView>

      {/* Status overlay pill */}
      {status === 'ON_THE_WAY' && driverName && (
        <View style={styles.driverPill}>
          <View style={styles.driverPillDot} />
          <Text style={styles.driverPillText}>
            {driverName} esta en camino
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.cloud,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverPill: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  driverPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.agave,
  },
  driverPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors.ink,
  },
});
