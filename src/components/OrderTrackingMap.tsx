import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Image, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';
import { PIDEYA_MAP_STYLE } from '../constants/mapStyle';
import { getDirectionsRoute } from '../services/directions';
import { toCoordinate, Coordinate } from '../utils/coordinates';

interface Props {
  restaurantLat: number | null;
  restaurantLng: number | null;
  restaurantName?: string;
  clientLat: number;
  clientLng: number;
  driverLat: number | null;
  driverLng: number | null;
  driverName?: string | null;
  driverUpdatedAt?: string | null;
  status: string;
  onRouteInfo?: (eta: string | null, distance: string | null) => void;
}

export const OrderTrackingMap: React.FC<Props> = ({ restaurantLat, restaurantLng, restaurantName, clientLat, clientLng, driverLat, driverLng, driverName, driverUpdatedAt, status, onRouteInfo }) => {
  const mapRef = useRef<MapView>(null);
  const driverRef = useRef<React.ElementRef<typeof Marker>>(null);
  const [ready, setReady] = useState(false);
  const [driverImageLoaded, setDriverImageLoaded] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const locationTime = Date.parse(driverUpdatedAt ?? '');
  const staleDriver = !Number.isFinite(locationTime) || now - locationTime > 90_000;
  const fitted = useRef('');
  const restaurant = useMemo(() => toCoordinate(restaurantLat, restaurantLng), [restaurantLat, restaurantLng]);
  const client = useMemo(() => toCoordinate(clientLat, clientLng), [clientLat, clientLng]);
  const driver = useMemo(() => toCoordinate(driverLat, driverLng), [driverLat, driverLng]);
  const points = useMemo(() => [restaurant, client, driver].filter((p): p is Coordinate => !!p), [restaurant, client, driver]);
  const latest = useRef({ restaurant, client, driver, onRouteInfo });
  latest.current = { restaurant, client, driver, onRouteInfo };
  // Android's native marker animation avoids animated props crossing the native map bridge.
  const initialDriver = useRef(driver);
  if (!initialDriver.current && driver) initialDriver.current = driver;
  useEffect(() => {
    if (ready && driver && Platform.OS === 'android') driverRef.current?.animateMarkerToCoordinate(driver, 1500);
  }, [driver, ready]);
  useEffect(() => {
    if (!driverImageLoaded || !ready) return;
    const timer = setTimeout(() => driverRef.current?.redraw(), 100);
    return () => clearTimeout(timer);
  }, [driverImageLoaded, ready, driverName]);

  const recenter = useCallback(() => {
    if (!ready || !points.length) return;
    if (points.length === 1) {
      mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
    } else {
      mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 110, right: 55, bottom: 340, left: 55 }, animated: true });
    }
  }, [ready, points]);
  useEffect(() => {
    // Fit initially and when a driver first appears. Let the customer pan freely afterwards.
    const key = `${!!restaurant}:${!!client}:${!!driver}`;
    if (!ready || !points.length || fitted.current === key) return;
    fitted.current = key;
    recenter();
  }, [ready, restaurant, client, driver, points.length, recenter]);

  useEffect(() => {
    let active = true;
    let pending = false;
    setRouteCoords([]);
    setRouteUnavailable(false);
    latest.current.onRouteInfo?.(null, null);
    const fetchRoute = async () => {
      if (pending || !active) return;
      const { restaurant, driver, client } = latest.current;
      // ETA represents delivery travel only, after the driver starts heading to the customer.
      const origin = status === 'ON_THE_WAY' ? (staleDriver ? null : driver) : restaurant;
      if (!origin || !client) {
        setRouteCoords([]);
        setRouteUnavailable(true);
        latest.current.onRouteInfo?.(null, null);
        return;
      }
      pending = true;
      try {
        const result = await getDirectionsRoute(origin.latitude, origin.longitude, client.latitude, client.longitude);
        if (!active) return;
        setRouteCoords(result?.coordinates ?? []);
        setRouteUnavailable(!result);
        latest.current.onRouteInfo?.(status === 'ON_THE_WAY' ? result?.duration ?? null : null, result?.distance ?? null);
      } finally { pending = false; }
    };
    void fetchRoute();
    const timer = setInterval(fetchRoute, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [status, restaurantLat, restaurantLng, clientLat, clientLng, !!driver, staleDriver]);

  if (!points.length) return <View style={styles.empty}><Ionicons name="location-outline" size={32} color={colors.agave} /><Text style={styles.caption}>Esperando la ubicación del pedido</Text></View>;

  return <View style={styles.container}>
    <MapView ref={mapRef} style={StyleSheet.absoluteFillObject}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ ...points[0], latitudeDelta: 0.025, longitudeDelta: 0.025 }}
      onMapReady={() => setReady(true)} customMapStyle={PIDEYA_MAP_STYLE}
      showsUserLocation={false} showsMyLocationButton={false} showsCompass={false} toolbarEnabled={false}>
      {routeCoords.length > 1 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor={colors.agave} />}
      {restaurant && <Marker coordinate={restaurant} title={restaurantName || 'Establecimiento'} description="Origen de tu pedido" tracksViewChanges={false}>
        <View style={[styles.pin, styles.storePin]}><Ionicons name="storefront" size={22} color={colors.white} /></View>
      </Marker>}
      {client && <Marker coordinate={client} title="Tu destino" description="Punto de entrega" tracksViewChanges={false}>
        <View style={styles.pin}><Ionicons name="home" size={22} color={colors.white} /></View>
      </Marker>}
      {driver && <Marker ref={driverRef} coordinate={Platform.OS === 'android' ? initialDriver.current! : driver}
        title={driverName || 'Tu repartidor'} description="Última ubicación recibida" anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={!driverImageLoaded} zIndex={3}>
        <View style={styles.driverPin}><Image source={require('../../assets/scooter-3d.png')} style={styles.scooter} fadeDuration={0} onLoad={() => setDriverImageLoaded(true)} /></View>
      </Marker>}
    </MapView>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Centrar mapa en mi pedido" style={styles.recenter} onPress={recenter}>
      <Ionicons name="locate" size={24} color={colors.agave} />
    </TouchableOpacity>
    {(routeUnavailable || (driver && staleDriver)) && <View style={styles.routeNotice}><Text style={styles.caption}>{driver && staleDriver ? 'Última ubicación conocida · esperando señal' : 'Ruta no disponible · mostrando ubicaciones'}</Text></View>}
  </View>;
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.snow },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  pin: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.agave, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  storePin: { backgroundColor: colors.tierra },
  driverPin: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors['agave-light'], borderColor: colors.agave, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scooter: { width: 68, height: 68, resizeMode: 'contain' },
  recenter: { position: 'absolute', top: 110, right: spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  routeNotice: { position: 'absolute', top: 168, left: spacing.lg, right: spacing.lg, backgroundColor: colors.white, borderRadius: 12, padding: spacing.sm },
  caption: { fontFamily: fonts.outfit.medium, color: colors['ink-secondary'], fontSize: 12, textAlign: 'center' },
});
