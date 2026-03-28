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
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

const { width: SCREEN_W } = Dimensions.get('window');

type NavType = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'AddressPicker'>;

// Default to Tepatitlán de Morelos, Los Altos de Jalisco
const DEFAULT_REGION: Region = {
  latitude: 20.8167,
  longitude: -102.7633,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export const AddressPickerScreen: React.FC = () => {
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

  // Reverse geocode when pin moves
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoadingGeocode(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const parts = [
          r.street,
          r.streetNumber,
          r.district || r.subregion,
          r.city,
        ].filter(Boolean);
        const text = parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setReverseAddress(text);
        if (!addressText) setAddressText(text);
      }
    } catch {
      setReverseAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoadingGeocode(false);
    }
  }, [addressText]);

  useEffect(() => {
    reverseGeocode(pinLocation.latitude, pinLocation.longitude);
  }, [pinLocation.latitude, pinLocation.longitude]);

  // Get current location
  const goToMyLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
      // silently fail
    } finally {
      setLoadingLocation(false);
    }
  };

  // Auto-locate on mount if no initial coords
  useEffect(() => {
    if (!hasInitial) goToMyLocation();
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
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        mapRef.current?.animateToRegion(newRegion, 600);
        setPinLocation({ latitude, longitude });
        setRegion(newRegion);
      }
    } catch {
      // fallback
    } finally {
      setLoadingGeocode(false);
    }
  };

  const handleRegionChange = (r: Region) => {
    setRegion(r);
    setPinLocation({ latitude: r.latitude, longitude: r.longitude });
  };

  const handleConfirm = () => {
    const finalAddress = addressText.trim() || reverseAddress;
    navigation.navigate('Checkout' as never);
    // Pass back data via route params callback
    if (route.params?.onSelect) {
      route.params.onSelect({
        address: finalAddress,
        latitude: pinLocation.latitude,
        longitude: pinLocation.longitude,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: insets.top + 80, bottom: 200, left: 0, right: 0 }}
      />

      {/* Center Pin (fixed over map) */}
      <View style={styles.pinContainer} pointerEvents="none">
        <View style={styles.pinShadow} />
        <View style={styles.pinBody}>
          <Ionicons name="location" size={36} color={colors.agave} />
        </View>
        <View style={styles.pinDot} />
      </View>

      {/* Top bar: back + search */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors['ink-muted']} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar direccion..."
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

      {/* My location button */}
      <TouchableOpacity
        style={[styles.myLocationBtn, { bottom: 220 }]}
        onPress={goToMyLocation}
        activeOpacity={0.8}
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={colors.agave} />
        ) : (
          <Ionicons name="navigate" size={22} color={colors.agave} />
        )}
      </TouchableOpacity>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        {/* Address display */}
        <View style={styles.addressRow}>
          <View style={styles.addressDot}>
            <Ionicons name="location" size={20} color={colors.white} />
          </View>
          <View style={styles.addressInfo}>
            {loadingGeocode ? (
              <ActivityIndicator size="small" color={colors.agave} />
            ) : (
              <>
                <Text style={styles.addressMain} numberOfLines={2}>
                  {reverseAddress || 'Mueve el mapa para seleccionar'}
                </Text>
                <Text style={styles.addressHint}>
                  Ajusta el pin a la ubicacion exacta de entrega
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Editable address + reference */}
        <TextInput
          style={styles.editableAddress}
          placeholder="Confirma o edita la direccion"
          placeholderTextColor={colors['ink-hint']}
          value={addressText}
          onChangeText={setAddressText}
          multiline
        />

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!addressText.trim() && !reverseAddress) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={!addressText.trim() && !reverseAddress}
        >
          <Ionicons name="checkmark-circle" size={22} color={colors.white} />
          <Text style={styles.confirmBtnText}>Confirmar ubicacion</Text>
        </TouchableOpacity>
      </View>
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

  // ── Center pin (floating) ──
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -52,
    alignItems: 'center',
  },
  pinBody: {
    // slight lift effect
  },
  pinShadow: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors['agave-dark'],
    marginTop: -4,
  },

  // ── Top search bar ──
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    height: 42,
    paddingVertical: 0,
  },

  // ── My location FAB ──
  myLocationBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  // ── Bottom card ──
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  addressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressMain: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  addressHint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
    marginTop: 2,
  },
  editableAddress: {
    backgroundColor: colors.snow,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    minHeight: 44,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  confirmBtn: {
    backgroundColor: colors.agave,
    height: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.white,
  },
});
