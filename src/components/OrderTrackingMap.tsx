import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, Animated as RNAnimated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { PIDEYA_MAP_STYLE } from '../constants/mapStyle';
import { getDirectionsRoute } from '../services/directions';

const { width: SCREEN_W } = Dimensions.get('window');

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
  /** If true, map is large and interactive (scroll/zoom enabled) */
  interactive?: boolean;
}

// ─── Custom Markers (Branding PideYa) ─────────────────────────

/** Destination marker — Dark square pin like Uber */
const DestinationMarker = ({ label }: { label?: string }) => (
  <View style={destStyles.container}>
    <View style={destStyles.square}>
      <View style={destStyles.innerDot} />
    </View>
    <View style={destStyles.stem} />
    {label ? <Text style={destStyles.label}>{label}</Text> : null}
  </View>
);

const destStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  square: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1A1D21',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  stem: {
    width: 3,
    height: 10,
    backgroundColor: '#1A1D21',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: '#1A1D21',
    marginTop: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

/** Restaurant marker — Branded with tierra color */
const RestaurantMarker = ({ name }: { name?: string }) => (
  <View style={restStyles.container}>
    <View style={restStyles.bubble}>
      <Ionicons name="restaurant" size={16} color="#FFFFFF" />
    </View>
    <View style={restStyles.arrow} />
    {name ? <Text style={destStyles.label}>{name}</Text> : null}
  </View>
);

const restStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C4956A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#C4956A',
    marginTop: -2,
  },
});

/** Driver marker — Agave-branded moto with pulse ring */
const DriverMarkerView = ({ name }: { name?: string | null }) => {
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View style={driverMStyles.container}>
      <RNAnimated.View
        style={[
          driverMStyles.pulse,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.8],
                }),
              },
            ],
          },
        ]}
      />
      <View style={driverMStyles.outerRing}>
        <View style={driverMStyles.innerCircle}>
          <Text style={driverMStyles.motoIcon}>🛵</Text>
        </View>
      </View>
      {name ? (
        <View style={driverMStyles.labelBg}>
          <Text style={driverMStyles.label} numberOfLines={1}>{name}</Text>
        </View>
      ) : null}
    </View>
  );
};

const driverMStyles = StyleSheet.create({
  container: { alignItems: 'center', width: 80 },
  pulse: {
    position: 'absolute',
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D8B7A',
    alignSelf: 'center',
  },
  outerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 139, 122, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D8B7A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  motoIcon: {
    fontSize: 16,
  },
  labelBg: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: '#1A1D21',
    textAlign: 'center',
    maxWidth: 90,
  },
});

// ─── Main Component ───────────────────────────────────────────

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
  interactive = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeETA, setRouteETA] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const lastRouteFetch = useRef<string>('');

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

  // Fetch route from Directions API
  const fetchRoute = useCallback(async () => {
    // Determine origin and destination based on status
    let originLat: number | null = null;
    let originLng: number | null = null;
    const destLat = clientLat;
    const destLng = clientLng;

    if (status === 'ON_THE_WAY' && driverLat && driverLng) {
      // Route from driver to client
      originLat = driverLat;
      originLng = driverLng;
    } else if (status === 'ACCEPTED' && restaurantLat && restaurantLng) {
      // Route from restaurant to client
      originLat = restaurantLat;
      originLng = restaurantLng;
    }

    if (!originLat || !originLng || !destLat || !destLng) return;

    // Throttle: don't refetch if origin hasn't moved significantly (~100m)
    const key = `${originLat.toFixed(3)},${originLng.toFixed(3)}>${destLat.toFixed(4)},${destLng.toFixed(4)}`;
    if (key === lastRouteFetch.current) return;
    lastRouteFetch.current = key;

    const result = await getDirectionsRoute(originLat, originLng, destLat, destLng);
    if (result) {
      setRouteCoords(result.coordinates);
      setRouteETA(result.duration);
      setRouteDistance(result.distance);
    }
  }, [status, driverLat, driverLng, restaurantLat, restaurantLng, clientLat, clientLng]);

  // Fetch route on mount and when driver moves
  useEffect(() => {
    if (status === 'ON_THE_WAY' || status === 'ACCEPTED') {
      fetchRoute();
    }
  }, [fetchRoute, status]);

  // Refetch route every 30 seconds when ON_THE_WAY
  useEffect(() => {
    if (status !== 'ON_THE_WAY') return;
    const interval = setInterval(() => {
      lastRouteFetch.current = ''; // Force refetch
      fetchRoute();
    }, 30_000);
    return () => clearInterval(interval);
  }, [status, fetchRoute]);

  // Fit map to all markers + route
  useEffect(() => {
    if (markers.length === 0 || !mapRef.current) return;
    const timer = setTimeout(() => {
      const allCoords = [
        ...markers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
        ...(routeCoords.length > 2 ? [routeCoords[0], routeCoords[routeCoords.length - 1]] : []),
      ];
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 60, right: 60, bottom: 80, left: 60 },
        animated: true,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [markers, routeCoords.length > 0]);

  const hasCoords = markers.length > 0;
  if (!hasCoords) return null;

  const center = {
    latitude: markers[0].lat,
    longitude: markers[0].lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const mapHeight = interactive ? SCREEN_W * 0.85 : 240;

  return (
    <View style={[styles.container, interactive && styles.containerInteractive, { height: mapHeight }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={center}
        customMapStyle={PIDEYA_MAP_STYLE}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {/* Route polyline — thick dark line like Uber */}
        {routeCoords.length > 1 && (
          <>
            {/* Outer shadow line */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={7}
              strokeColor="rgba(26, 29, 33, 0.15)"
              lineCap="round"
              lineJoin="round"
            />
            {/* Main route line */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={4}
              strokeColor="#1A1D21"
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Restaurant marker */}
        {restaurantLat && restaurantLng && (
          <Marker
            coordinate={{ latitude: restaurantLat, longitude: restaurantLng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <RestaurantMarker name={restaurantName} />
          </Marker>
        )}

        {/* Client/Destination marker */}
        {clientLat !== 0 && clientLng !== 0 && (
          <Marker
            coordinate={{ latitude: clientLat, longitude: clientLng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <DestinationMarker label="Tu ubicación" />
          </Marker>
        )}

        {/* Driver marker (realtime) */}
        {driverLat && driverLng && (
          <Marker
            coordinate={{ latitude: driverLat, longitude: driverLng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <DriverMarkerView name={driverName} />
          </Marker>
        )}
      </MapView>

      {/* Status overlay pill */}
      <View style={styles.overlayTop}>
        {status === 'ON_THE_WAY' && routeETA && (
          <View style={styles.etaPill}>
            <Ionicons name="time-outline" size={14} color="#2D8B7A" />
            <Text style={styles.etaPillText}>{routeETA}</Text>
            {routeDistance && (
              <>
                <View style={styles.etaDivider} />
                <Text style={styles.etaPillTextMuted}>{routeDistance}</Text>
              </>
            )}
          </View>
        )}
        {status === 'ACCEPTED' && (
          <View style={styles.statusPill}>
            <View style={styles.statusPillDotPreparing} />
            <Text style={styles.statusPillText}>Preparando tu pedido</Text>
          </View>
        )}
      </View>

      {/* Driver info pill at bottom */}
      {status === 'ON_THE_WAY' && driverName && (
        <View style={styles.driverPill}>
          <View style={styles.driverPillDot} />
          <Text style={styles.driverPillText}>
            {driverName} está en camino
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  containerInteractive: {
    marginHorizontal: 0,
    borderRadius: 0,
    marginBottom: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Overlay top
  overlayTop: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
  },
  // ETA pill
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  etaPillText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: '#1A1D21',
  },
  etaPillTextMuted: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#9e9e9e',
  },
  etaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
  },
  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statusPillDotPreparing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4956A',
  },
  statusPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: '#1A1D21',
  },
  // Driver pill
  driverPill: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  driverPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D8B7A',
  },
  driverPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: '#1A1D21',
  },
});
