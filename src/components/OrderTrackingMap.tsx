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

// ─── Custom Markers ───────────────────────────────────────────

/** Destination marker — Dark square pin like Uber */
const DestinationMarker = ({ label }: { label?: string }) => (
  <View style={destStyles.wrapper}>
    <View style={destStyles.square}>
      <View style={destStyles.innerDot} />
    </View>
    <View style={destStyles.stem} />
    {label ? <Text style={destStyles.label}>{label}</Text> : null}
  </View>
);

const destStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 80 },
  square: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1D21',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  stem: {
    width: 3,
    height: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

/** Restaurant marker — Branded pin */
const RestaurantMarker = ({ name }: { name?: string }) => (
  <View style={restStyles.wrapper}>
    <View style={restStyles.bubble}>
      <Ionicons name="restaurant" size={16} color="#FFFFFF" />
    </View>
    <View style={restStyles.arrow} />
    {name ? <Text style={destStyles.label}>{name}</Text> : null}
  </View>
);

const restStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 80 },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C4956A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#C4956A',
    marginTop: -2,
  },
});

/** Driver marker — Animated delivery pin with pulse */
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
    <View style={driverMStyles.wrapper}>
      <RNAnimated.View
        style={[
          driverMStyles.pulse,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2],
                }),
              },
            ],
          },
        ]}
      />
      <View style={driverMStyles.outerRing}>
        <View style={driverMStyles.innerCircle}>
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
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
  wrapper: { alignItems: 'center', width: 90 },
  pulse: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D8B7A',
    alignSelf: 'center',
  },
  outerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(45, 139, 122, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D8B7A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  labelBg: {
    marginTop: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#1A1D21',
    textAlign: 'center',
    maxWidth: 100,
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
  const hasFittedOnce = useRef(false);

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
    let originLat: number | null = null;
    let originLng: number | null = null;
    const destLat = clientLat;
    const destLng = clientLng;

    if (status === 'ON_THE_WAY' && driverLat && driverLng) {
      originLat = driverLat;
      originLng = driverLng;
    } else if (status === 'ACCEPTED' && restaurantLat && restaurantLng) {
      originLat = restaurantLat;
      originLng = restaurantLng;
    } else if (status === 'ON_THE_WAY' && restaurantLat && restaurantLng) {
      // Fallback: if no driver location yet, use restaurant
      originLat = restaurantLat;
      originLng = restaurantLng;
    }

    if (!originLat || !originLng || !destLat || !destLng) {
      // No origin available — draw straight line as fallback
      if (driverLat && driverLng && destLat && destLng) {
        setRouteCoords([
          { latitude: driverLat, longitude: driverLng },
          { latitude: destLat, longitude: destLng },
        ]);
      }
      return;
    }

    // Throttle: don't refetch if origin hasn't moved significantly (~200m)
    const key = `${originLat.toFixed(3)},${originLng.toFixed(3)}>${destLat.toFixed(3)},${destLng.toFixed(3)}`;
    if (key === lastRouteFetch.current) return;
    lastRouteFetch.current = key;

    const result = await getDirectionsRoute(originLat, originLng, destLat, destLng);
    if (result && result.coordinates.length > 1) {
      setRouteCoords(result.coordinates);
      setRouteETA(result.duration);
      setRouteDistance(result.distance);
    } else {
      // Directions API failed — draw straight line as fallback
      setRouteCoords([
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng },
      ]);
      // Calculate rough ETA
      const R = 6371;
      const dLat = ((destLat - originLat) * Math.PI) / 180;
      const dLon = ((destLng - originLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((originLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const km = R * c;
      const mins = Math.max(1, Math.round((km / 25) * 60));
      setRouteETA(`~${mins} min`);
      setRouteDistance(`${km.toFixed(1)} km`);
    }
  }, [status, driverLat, driverLng, restaurantLat, restaurantLng, clientLat, clientLng]);

  // Fetch route on mount and when status/driver changes
  useEffect(() => {
    if (status === 'ON_THE_WAY' || status === 'ACCEPTED') {
      fetchRoute();
    }
  }, [fetchRoute, status]);

  // Refetch route every 30 seconds when ON_THE_WAY
  useEffect(() => {
    if (status !== 'ON_THE_WAY') return;
    const interval = setInterval(() => {
      lastRouteFetch.current = '';
      fetchRoute();
    }, 30_000);
    return () => clearInterval(interval);
  }, [status, fetchRoute]);

  // ALWAYS fit map to show all markers compactly
  useEffect(() => {
    if (markers.length < 2 || !mapRef.current) return;
    const timer = setTimeout(() => {
      const allCoords = markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 80, bottom: 100, left: 80 },
        animated: hasFittedOnce.current,
      });
      hasFittedOnce.current = true;
    }, hasFittedOnce.current ? 200 : 800);
    return () => clearTimeout(timer);
  }, [markers]);

  // Re-fit when driver moves significantly
  useEffect(() => {
    if (!driverLat || !driverLng || markers.length < 2 || !mapRef.current) return;
    const allCoords = markers.map((m) => ({ latitude: m.lat, longitude: m.lng }));
    mapRef.current?.fitToCoordinates(allCoords, {
      edgePadding: { top: 80, right: 80, bottom: 100, left: 80 },
      animated: true,
    });
  }, [driverLat, driverLng]);

  const hasCoords = markers.length > 0;
  if (!hasCoords) return null;

  const center = {
    latitude: markers[0].lat,
    longitude: markers[0].lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const mapHeight = interactive ? SCREEN_W * 0.85 : 260;

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
        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <>
            {/* Shadow line */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={8}
              strokeColor="rgba(26, 29, 33, 0.12)"
              lineCap="round"
              lineJoin="round"
            />
            {/* Main route */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={5}
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

        {/* Driver marker */}
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

      {/* ETA + Distance overlay — always show when available */}
      {routeETA && (status === 'ON_THE_WAY' || status === 'ACCEPTED') && (
        <View style={styles.etaContainer}>
          <View style={styles.etaPill}>
            <Ionicons name="time-outline" size={14} color="#2D8B7A" />
            <Text style={styles.etaText}>{routeETA}</Text>
            {routeDistance && (
              <>
                <View style={styles.etaDivider} />
                <Ionicons name="location-outline" size={13} color="#9e9e9e" />
                <Text style={styles.etaTextMuted}>{routeDistance}</Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* Driver status pill */}
      {status === 'ON_THE_WAY' && driverName && (
        <View style={styles.driverPill}>
          <View style={styles.driverPillDot} />
          <Text style={styles.driverPillText}>
            {driverName} está en camino
          </Text>
        </View>
      )}

      {status === 'ACCEPTED' && (
        <View style={styles.driverPill}>
          <View style={[styles.driverPillDot, { backgroundColor: '#C4956A' }]} />
          <Text style={styles.driverPillText}>Preparando tu pedido</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  containerInteractive: {
    marginHorizontal: 0,
    borderRadius: 0,
    marginBottom: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // ETA overlay — top center
  etaContainer: {
    position: 'absolute',
    top: spacing.sm + 4,
    alignSelf: 'center',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  etaText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: '#1A1D21',
  },
  etaTextMuted: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#9e9e9e',
  },
  etaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 2,
  },
  // Driver pill — bottom center
  driverPill: {
    position: 'absolute',
    bottom: spacing.sm + 4,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
