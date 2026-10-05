import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, UNSTABLE_usePreventRemove as usePreventRemove, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fonts } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { toCoordinate } from '../../utils/coordinates';
import * as addressService from '../../services/addresses';
import type { UserAddress } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

const { width: SCREEN_W } = Dimensions.get('window');

type NavType = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'AddressPicker'>;

// ── Uber Eats Minimalist Grayscale Map Style ──
const UBER_EATS_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

// Default to Tepatitlán de Morelos, Los Altos de Jalisco
const DEFAULT_REGION: Region = {
  latitude: 20.8167,
  longitude: -102.7633,
  latitudeDelta: 0.006,
  longitudeDelta: 0.006,
};

export const AddressPickerScreen: React.FC = () => {
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Casa');
  const navigation = useNavigation<NavType>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const initialLat = route.params?.latitude;
  const initialLng = route.params?.longitude;
  const hasInitial = initialLat && initialLng && initialLat !== 0;

  const [region, setRegion] = useState<Region>(
    hasInitial
      ? { latitude: initialLat, longitude: initialLng, latitudeDelta: 0.005, longitudeDelta: 0.005 }
      : DEFAULT_REGION,
  );
  const [pinLocation, setPinLocation] = useState({
    latitude: hasInitial ? initialLat : DEFAULT_REGION.latitude,
    longitude: hasInitial ? initialLng : DEFAULT_REGION.longitude,
  });
  const [addressText, setAddressText] = useState(route.params?.currentAddress || '');
  const [searchText, setSearchText] = useState('');
  const [reverseAddress, setReverseAddress] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [hasChosenPoint, setHasChosenPoint] = useState(!!hasInitial && !route.params?.onboarding);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [gpsAllowed, setGpsAllowed] = useState(false);
  const editedAddress = useRef(!!route.params?.currentAddress);
  const mapDragged = useRef(false);
  const confirmed = useRef(false);
  const allowExit = useRef(false);
  usePreventRemove(!!route.params?.onboarding, ({ data }) => {
    if (confirmed.current || allowExit.current) { navigation.dispatch(data.action); return; }
    Alert.alert('Falta tu dirección de entrega', 'Guarda una ubicación para descubrir los restaurantes y tiendas que llegan a ti. Puedes buscarla o elegir el punto en el mapa, sin activar el GPS.', [
      { text: 'Configurar mi ubicación', style: 'cancel' },
      { text: 'Volver al inicio', onPress: () => { allowExit.current = true; navigation.dispatch(data.action); } },
    ]);
  });


  // Load saved addresses
  useEffect(() => {
    const fetchAddrs = async () => {
      const addrs = await addressService.getAddresses();
      setSavedAddresses(addrs);
      const def = addrs.find((a) => a.is_default) ?? addrs[0];
      if (def) {
        setSelectedAddressId(def.id);
      }
    };
    void fetchAddrs().catch(() => setLocationNotice('No pudimos cargar tus direcciones guardadas. Puedes elegir un punto en el mapa.'));
  }, []);

  // Ignore delayed geocoding from a previous pin; never overwrite an address the user is typing.
  useEffect(() => {
    let active = true;
    const { latitude, longitude } = pinLocation;
    const timer = setTimeout(async () => {
      setLoadingGeocode(true);
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!active) return;
        const result = results[0];
        const text = result ? [result.street, result.streetNumber, result.district || result.subregion, result.city].filter(Boolean).join(', ') : '';
        setReverseAddress(text);
        if (!editedAddress.current) setAddressText(text);
      } catch {
        if (active) setLocationNotice('Escribe calle y número y confirma la entrada con el pin.');
      } finally { if (active) setLoadingGeocode(false); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [pinLocation.latitude, pinLocation.longitude]);

  // Get current location
  const goToMyLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationNotice('Sin problema: busca tu dirección arriba o mueve el mapa hasta la entrada.');
        setLoadingLocation(false);
        return;
      }
      setGpsAllowed(true);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS timeout')), 12_000); }),
      ]).finally(() => clearTimeout(timer));
      setHasChosenPoint(true); editedAddress.current = false;
      setLocationNotice('Ajusta el pin a la entrada y revisa la dirección antes de continuar.');
      const newRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      setPinLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion(newRegion);
    } catch {
      setLocationNotice('No pudimos obtener tu ubicación. Puedes buscar la dirección o mover el mapa.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Auto-locate on mount if no initial coords
  useEffect(() => {
    if (route.params?.locateOnOpen === true || (!hasInitial && route.params?.locateOnOpen !== false)) void goToMyLocation();
  }, []);

  // Search address
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setLoadingGeocode(true);
    try {
      const results = await Location.geocodeAsync(searchText.trim());
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setHasChosenPoint(true); editedAddress.current = false;
        setLocationNotice(null);
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        mapRef.current?.animateToRegion(newRegion, 600);
        setPinLocation({ latitude, longitude });
        setRegion(newRegion);
      } else {
        setLocationNotice('No encontramos esa dirección. Incluye la ciudad o ubica el pin manualmente.');
      }
    } catch {
      setLocationNotice('No pudimos buscar la dirección. Mueve el mapa hasta la entrada y escribe calle y número.');
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleRegionChange = (r: Region) => {
    if (Math.abs(r.latitude - pinLocation.latitude) < 0.000001 && Math.abs(r.longitude - pinLocation.longitude) < 0.000001) return;
    if (mapDragged.current) { setHasChosenPoint(true); setSelectedAddressId(null); }
    mapDragged.current = false;
    editedAddress.current = false;
    setAddressText(''); setReverseAddress('');
    setRegion(r);
    setPinLocation({ latitude: r.latitude, longitude: r.longitude });
  };

  const handleSelectSavedAddress = (addr: UserAddress) => {
    setHasChosenPoint(true);
    editedAddress.current = true;
    setSelectedAddressId(addr.id);
    setAddressText(addr.address_text);
    if (addr.latitude && addr.longitude) {
      const newRegion: Region = {
        latitude: addr.latitude,
        longitude: addr.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      setPinLocation({ latitude: addr.latitude, longitude: addr.longitude });
    }
  };

  const handleConfirm = async () => {
    const finalAddress = addressText.trim();
    if (saving || !hasChosenPoint || !toCoordinate(pinLocation.latitude, pinLocation.longitude) || !finalAddress || loadingLocation || loadingGeocode) return;
    if (route.params?.onSelect) {
      confirmed.current = true;
      route.params.onSelect({ address: finalAddress, latitude: pinLocation.latitude, longitude: pinLocation.longitude });
      navigation.goBack();
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      const selected = savedAddresses.find(a => a.id === selectedAddressId && a.latitude === pinLocation.latitude && a.longitude === pinLocation.longitude && a.address_text === finalAddress);
      if (selected) await addressService.setDefaultAddress(selected.id);
      else await addressService.addAddress({ user_id: user.id, label: saveLabel, address_text: finalAddress, reference: null, latitude: pinLocation.latitude, longitude: pinLocation.longitude, is_default: true, is_pin_location: true });
      confirmed.current = true;
      navigation.goBack();
    } catch { Alert.alert('No se guardó la dirección', 'Revisa tu conexión e intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      {/* Uber Eats Grayscale Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        customMapStyle={UBER_EATS_MAP_STYLE}
        onRegionChangeComplete={handleRegionChange}
        onPanDrag={() => { mapDragged.current = true; }}
        showsUserLocation={gpsAllowed}
        showsMyLocationButton={false}
        mapPadding={{ top: insets.top + 80, bottom: Math.min(windowHeight * 0.5, 380), left: 0, right: 0 }}
        onPress={event => {
          const point = event.nativeEvent.coordinate;
          setHasChosenPoint(true); editedAddress.current = false;
          setAddressText(''); setReverseAddress('');
          setPinLocation(point);
          mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
        }}
      >
        <Marker coordinate={pinLocation} title="Tu punto de entrega" description="Confirma la entrada de tu casa o trabajo" pinColor={colors.agave} />
      </MapView>

      {/* Top Header & Search Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors['ink-muted']} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dirección..."
            placeholderTextColor={colors['ink-hint']}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors['ink-hint']} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Floating Action Column (Right Side - Uber Eats Style) */}
      <View style={[styles.floatingColumn, { top: insets.top + 68 }]}>
        <TouchableOpacity
          style={styles.floatingActionBtn}
          onPress={goToMyLocation}
          activeOpacity={0.85}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={colors.agave} />
          ) : (
            <Ionicons name="locate-outline" size={22} color={colors.ink} />
          )}
        </TouchableOpacity>


      </View>

      {/* Bottom Sheet (Uber Eats Style Super-Rounded Card) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <ScrollView style={[styles.bottomSheet, { maxHeight: windowHeight * 0.55 }]} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
          {/* Top Drag Handle Indicator */}
          <View style={styles.sheetHandleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header Row: Destination + ETA Badge */}
          <View style={styles.sheetHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetHeaderLabel}>{route.params?.onboarding ? 'PASO 1 · CONFIRMA TU UBICACIÓN' : 'Entregar en'}</Text>
              {loadingGeocode ? (
                <ActivityIndicator size="small" color={colors.agave} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : (
                <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
                  {reverseAddress || 'Mueve el mapa para seleccionar'}
                </Text>
              )}
            </View>

          </View>

          <Text style={{ fontFamily: fonts.outfit.regular, color: colors['ink-secondary'], fontSize: 13, lineHeight: 18, marginBottom: 12 }} accessibilityLiveRegion="polite">{locationNotice || 'Mueve el mapa hasta la entrada de tu casa o trabajo. Después confirma calle y número.'}</Text>
          {/* Quick-Select Saved Addresses */}
          {savedAddresses.length > 0 && <Text style={styles.savedAddressesTitle}>Tus direcciones guardadas</Text>}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedAddressesScroll}
          >
            {savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                const iconName = addr.label.toLowerCase().includes('casa')
                  ? 'home-outline'
                  : addr.label.toLowerCase().includes('trabajo')
                  ? 'briefcase-outline'
                  : 'location-outline';

                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardSelected,
                    ]}
                    onPress={() => handleSelectSavedAddress(addr)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.addressCardIcon, isSelected && styles.addressCardIconSelected]}>
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={isSelected ? colors.white : colors.agave}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addressCardTitleRow}>
                        <Text style={[styles.addressCardLabel, isSelected && styles.addressCardLabelSelected]}>
                          {addr.label}
                        </Text>
                        {addr.is_default && (
                          <View style={styles.defaultPill}>
                            <Text style={styles.defaultPillText}>Principal</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressCardSub} numberOfLines={1}>
                        {addr.address_text}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.agave} style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: colors.agave, fontFamily: fonts.outfit.medium }}>En el siguiente paso podrás nombrarla Casa, Trabajo u Otro.</Text>
            )}
          </ScrollView>

          {/* Editable instructions field */}
          <TextInput
            style={styles.editableAddress}
            placeholder="Calle, número y colonia"
            placeholderTextColor={colors['ink-hint']}
            value={addressText}
            onChangeText={text => { editedAddress.current = true; setAddressText(text); }}
            multiline
          />

          {!route.params?.onSelect && <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>{['Casa', 'Trabajo', 'Otro'].map(label => <TouchableOpacity key={label} onPress={() => setSaveLabel(label)} style={{ padding: 12, borderRadius: 12, backgroundColor: saveLabel === label ? colors['agave-light'] : colors.cloud }}><Text style={{ color: colors.agave, fontFamily: fonts.outfit.semiBold }}>{label}</Text></TouchableOpacity>)}</View>}
          {/* Large Agave Teal Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!hasChosenPoint || !addressText.trim() || loadingLocation || loadingGeocode) && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            activeOpacity={0.9}
            disabled={saving || !hasChosenPoint || !addressText.trim() || loadingLocation || loadingGeocode}
          >
            <Ionicons name="navigate-circle-outline" size={24} color={colors.white} />
            <Text style={styles.confirmBtnText}>{saving ? 'Guardando…' : route.params?.onSelect ? 'Confirmar este punto' : 'Guardar dirección'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Center Destination Pin (Uber Eats style) ──
  pinContainer: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    marginLeft: -20,
    marginTop: -48,
    alignItems: 'center',
  },
  pinLabelBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinLabelText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.white,
  },
  pinBody: {
    alignItems: 'center',
  },
  pinShadow: {
    width: 18,
    height: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -6,
  },

  // ── Top Bar ──
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.ink,
    height: 44,
    paddingVertical: 0,
  },

  // ── Floating Controls Column (Right) ──
  floatingColumn: {
    position: 'absolute',
    right: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── Bottom Sheet (Uber Eats Style) ──
  keyboardAvoid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cloud,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetHeaderLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors['ink-muted'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetHeaderTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.agave,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  etaBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.white,
  },

  // ── Saved Address Cards ──
  savedAddressesTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors['ink-secondary'],
    marginBottom: spacing.xs,
  },
  savedAddressesScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    minWidth: 210,
    gap: spacing.sm,
  },
  addressCardSelected: {
    borderColor: colors.agave,
    backgroundColor: '#F0F9F7',
  },
  addressCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCardIconSelected: {
    backgroundColor: colors.agave,
  },
  addressCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressCardLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.ink,
  },
  addressCardLabelSelected: {
    color: colors['agave-dark'],
  },
  defaultPill: {
    backgroundColor: colors.cloud,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 9,
    color: colors['ink-secondary'],
  },
  addressCardSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: colors['ink-muted'],
    marginTop: 1,
    maxWidth: 140,
  },

  // ── Inputs & Action Button ──
  editableAddress: {
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.ink,
    minHeight: 44,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  confirmBtn: {
    backgroundColor: colors.agave,
    height: 54,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.agave,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.white,
  },
});
