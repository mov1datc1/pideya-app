import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { LogoLockup } from '../../components/branding/LogoLockup';
import { Card } from '../../components/ui/Card';
import { useRestaurants } from '../../hooks/useRestaurants';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { isRestaurantOpenNow } from '../../utils/timeUtils';
import * as addressService from '../../services/addresses';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { supabase } from '../../services/supabase';
import type { RootStackParamList } from '../../types/navigation';
import type { Restaurant, FoodType, UserAddress, AppCategory } from '../../types/database';

/** Haversine distance in km between two lat/lng points */
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CAROUSEL_CARD_GAP = 12;

// Dynamic categories will be fetched from the DB
// CATEGORIES array is removed

export const HomeScreen: React.FC = () => {
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurants, loading, error, search } = useRestaurants();
  const [appCategories, setAppCategories] = useState<{ label: string; value: string; emoji: string }[]>([{ label: 'Todos', value: 'ALL', emoji: '🛍️' }]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { activeOrders } = useOrders(profile?.phone ?? '');
  const activeOrder = activeOrders[0] ?? null;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('app_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (data && data.length > 0) {
          const mapped = data.map((c: AppCategory) => ({
            label: c.name,
            value: c.name,
            emoji: c.emoji
          }));
          setAppCategories([{ label: 'Todos', value: 'ALL', emoji: '🛍️' }, ...mapped]);
        }
      } catch (e) {
        console.warn('Error fetching categories:', e);
      }
    };
    void fetchCategories();
  }, []);

  // ── Location state ──
  const [userLat, setUserLat] = useState(0);
  const [userLng, setUserLng] = useState(0);
  const [userAddressLabel, setUserAddressLabel] = useState('Selecciona tu ubicación');
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  // ── Label dialog state (shown after map confirmation) ──
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<'Casa' | 'Trabajo' | 'Otro'>('Casa');
  const [customLabel, setCustomLabel] = useState('');

  // Load saved addresses + set default location
  useEffect(() => {
    const init = async () => {
      const addrs = await addressService.getAddresses();
      setSavedAddresses(addrs);
      const def = addrs.find((a) => a.is_default) ?? addrs[0];
      if (def) {
        setUserLat(def.latitude);
        setUserLng(def.longitude);
        setUserAddressLabel(def.label);
        setLocationReady(true);
      } else {
        // First time — open map for location selection
        requestGPSAndOpenMap();
      }
    };
    void init();
  }, []);

  /** Navigate to AddressPicker with GPS as starting point */
  const requestGPSAndOpenMap = useCallback(async () => {
    setShowLocationPicker(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let startLat = 20.8167; // Default Tepatitlán
      let startLng = -102.7633;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        startLat = loc.coords.latitude;
        startLng = loc.coords.longitude;
      }

      // Navigate to full-screen map for pin confirmation
      navigation.navigate('AddressPicker', {
        latitude: startLat,
        longitude: startLng,
        onSelect: (data: { address: string; latitude: number; longitude: number }) => {
          setPendingLocation(data);
          setShowLabelDialog(true);
        },
      });
    } catch {
      setLocationReady(true);
    }
  }, [navigation]);

  /** Open map from "Add new address" without GPS */
  const openMapForNewAddress = useCallback(() => {
    setShowLocationPicker(false);
    navigation.navigate('AddressPicker', {
      latitude: userLat || 20.8167,
      longitude: userLng || -102.7633,
      onSelect: (data: { address: string; latitude: number; longitude: number }) => {
        setPendingLocation(data);
        setShowLabelDialog(true);
      },
    });
  }, [navigation, userLat, userLng]);

  /** Save the pending location with the selected label */
  const saveLabeledAddress = useCallback(async () => {
    if (!pendingLocation) return;
    const label = selectedLabel === 'Otro' ? (customLabel.trim() || 'Mi dirección') : selectedLabel;

    const newAddr = await addressService.addAddress({
      user_id: profile?.full_name || 'local',
      label,
      address_text: pendingLocation.address,
      reference: null,
      latitude: pendingLocation.latitude,
      longitude: pendingLocation.longitude,
      is_default: true,
      is_pin_location: true,
    });

    setSavedAddresses((prev) => [...prev, newAddr]);
    setUserLat(pendingLocation.latitude);
    setUserLng(pendingLocation.longitude);
    setUserAddressLabel(label);
    setLocationReady(true);
    setShowLabelDialog(false);
    setPendingLocation(null);
    setCustomLabel('');
    setSelectedLabel('Casa');
  }, [pendingLocation, selectedLabel, customLabel, profile]);

  const selectSavedAddress = useCallback(async (addr: UserAddress) => {
    setUserLat(addr.latitude);
    setUserLng(addr.longitude);
    setUserAddressLabel(addr.label);
    setShowLocationPicker(false);
    await addressService.setDefaultAddress(addr.id);
  }, []);

  const deleteSavedAddress = useCallback(async (addr: UserAddress) => {
    Alert.alert(
      'Eliminar dirección',
      `¿Eliminar "${addr.label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await addressService.deleteAddress(addr.id);
            setSavedAddresses((prev) => prev.filter((a) => a.id !== addr.id));
            // If this was the active address, reset
            if (userAddressLabel === addr.label) {
              const remaining = savedAddresses.filter((a) => a.id !== addr.id);
              if (remaining.length > 0) {
                await selectSavedAddress(remaining[0]);
              } else {
                setUserAddressLabel('Selecciona tu ubicación');
              }
            }
          },
        },
      ],
    );
  }, [savedAddresses, userAddressLabel, selectSavedAddress]);

  // Banner animation
  const bannerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bannerAnim, {
      toValue: activeOrder ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeOrder]);

  // Filter by type AND distance
  const filteredRestaurants = useMemo(() => {
    let list = selectedType === 'ALL' ? restaurants : restaurants.filter((r) => r.type === selectedType);
    // Distance filter — only if user has location set
    if (userLat !== 0 && userLng !== 0) {
      list = list.filter((r) => {
        if (!r.lat || !r.lng) return true; // no coords = show anyway
        const dist = haversineKm(userLat, userLng, Number(r.lat), Number(r.lng));
        return dist <= (r.delivery_radius_km || 10);
      });
    }
    return list;
  }, [restaurants, selectedType, userLat, userLng]);

  // Featured: open restaurants with cover images (promos/popular)
  const featured = useMemo(
    () => restaurants.filter((r) => isRestaurantOpenNow(r.open_time, r.close_time, r.is_open) && (r.cover_url || r.photo_url)).slice(0, 8),
    [restaurants],
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    search(text);
  };

  const greeting = profile?.full_name
    ? `Hola, ${profile.full_name.split(' ')[0]}`
    : 'Buen dia';

  const navigateToRestaurant = (item: Restaurant) => {
    const isOpen = isRestaurantOpenNow(item.open_time, item.close_time, item.is_open);
    if (!isOpen) {
      Alert.alert(
        'Cerrado',
        'Este establecimiento se encuentra cerrado por el momento. Por favor, intenta más tarde.'
      );
      return;
    }
    navigation.navigate('RestaurantDetail', {
      restaurantId: item.id,
      restaurantName: item.name,
      restaurantType: item.type,
      coverUrl: item.cover_url || item.photo_url || undefined,
    });
  };

  const renderFeaturedCard = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigateToRestaurant(item)}
      style={styles.carouselCard}
    >
      <Image
        source={{ uri: item.cover_url || item.photo_url || '' }}
        style={styles.carouselImage}
      />
      <View style={styles.carouselOverlay} />
      <View style={styles.carouselInfo}>
        <Text style={styles.carouselName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.carouselMeta}>
          <Text style={styles.carouselType}>{item.type}</Text>
          {item.description ? (
            <>
              <View style={styles.carouselDot} />
              <Text style={styles.carouselDesc} numberOfLines={1}>{item.description}</Text>
            </>
          ) : null}
        </View>
      </View>
      {!isRestaurantOpenNow(item.open_time, item.close_time, item.is_open) && (
        <View style={styles.closedBadge}>
          <Text style={styles.closedText}>Cerrado</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigateToRestaurant(item)}
    >
      <Card style={styles.restaurantCard}>
        {(item.cover_url || item.photo_url) ? (
          <Image
            source={{ uri: item.cover_url || item.photo_url || '' }}
            style={styles.restaurantImage}
          />
        ) : (
          <View style={[styles.restaurantImage, styles.restaurantImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={32} color={colors['ink-hint']} />
          </View>
        )}
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.restaurantDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.restaurantMeta}>
            <Ionicons name="time-outline" size={14} color={colors['ink-muted']} />
            <Text style={styles.metaText}>{item.open_time} – {item.close_time}</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{item.type}</Text>
            {!isRestaurantOpenNow(item.open_time, item.close_time, item.is_open) && (
              <>
                <View style={styles.dot} />
                <Text style={[styles.metaText, { color: colors.error }]}>Cerrado</Text>
              </>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Distance badge helper
  const getDistanceText = (r: Restaurant): string | null => {
    if (userLat === 0 || userLng === 0 || !r.lat || !r.lng) return null;
    const d = haversineKm(userLat, userLng, Number(r.lat), Number(r.lng));
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  // Build a single scrollable data source with sections
  const ListHeader = () => (
    <>
      {/* ── LOCATION BANNER ── */}
      <TouchableOpacity
        style={styles.locationBanner}
        onPress={() => setShowLocationPicker(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="location" size={20} color={colors.agave} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>Entregando en</Text>
          <Text style={styles.locationValue} numberOfLines={1}>{userAddressLabel}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors['ink-muted']} />
      </TouchableOpacity>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subtitle}>Que se te antoja hoy?</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors['ink-hint']} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar establecimiento..."
          placeholderTextColor={colors['ink-hint']}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors['ink-hint']} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Icons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {appCategories.map((cat) => {
          const isActive = selectedType === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={styles.categoryItem}
              onPress={() => setSelectedType(cat.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryCircle, isActive && styles.categoryCircleActive]}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Featured Carousel */}
      {featured.length > 0 && !searchQuery && (
        <View style={styles.carouselSection}>
          <Text style={styles.sectionTitle}>Destacados</Text>
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `feat-${item.id}`}
            renderItem={renderFeaturedCard}
            contentContainerStyle={styles.carouselList}
            snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_GAP}
            decelerationRate="fast"
          />
        </View>
      )}

      {/* Section title for main list */}
      <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginTop: spacing.lg }]}>
        {selectedType === 'ALL' ? 'Todos los establecimientos' : appCategories.find(c => c.value === selectedType)?.label || 'Establecimientos'}
      </Text>
    </>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <LogoLockup size="sm" />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.agave}
          style={styles.loader}
        />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            activeOrder && { paddingBottom: spacing['4xl'] + 70 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay restaurantes disponibles</Text>
          }
        />
      )}

      {/* Active order floating banner */}
      {activeOrder && (
        <Animated.View
          style={[
            styles.activeBanner,
            {
              transform: [{
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              }],
              opacity: bannerAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.activeBannerInner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderStatus', { orderId: activeOrder.id })}
          >
            <View style={styles.activeBannerPulse} />
            <View style={styles.activeBannerContent}>
              <Text style={styles.activeBannerTitle}>
                {activeOrder.reference_code} en curso
              </Text>
              <Text style={styles.activeBannerStatus}>
                {activeOrder.status === 'PENDING' ? 'Esperando confirmacion' :
                  activeOrder.status === 'ACCEPTED' ? 'Preparando tu pedido' :
                    'En camino'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
      {/* ── LOCATION PICKER MODAL ── */}
      <Modal visible={showLocationPicker} animationType="slide" transparent>
        <View style={styles.locModalOverlay}>
          <View style={styles.locModalContent}>
            <View style={styles.locModalHeader}>
              <Text style={styles.locModalTitle}>📍 ¿Dónde quieres recibir?</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.locGpsBtn} onPress={() => void requestGPSAndOpenMap()}>
              <Ionicons name="navigate" size={20} color={colors.white} />
              <Text style={styles.locGpsBtnText}>Usar GPS y confirmar en mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.locAddBtn} onPress={openMapForNewAddress}>
              <Ionicons name="add-circle-outline" size={20} color={colors.agave} />
              <Text style={styles.locAddBtnText}>Agregar nueva dirección</Text>
            </TouchableOpacity>

            {savedAddresses.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.locSavedTitle}>Direcciones guardadas</Text>
                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  {savedAddresses.map((addr) => {
                    const isActive = userAddressLabel === addr.label;
                    const iconName = addr.label.toLowerCase().includes('casa') ? 'home' :
                      addr.label.toLowerCase().includes('trabajo') ? 'briefcase' : 'location';
                    return (
                      <View
                        key={addr.id}
                        style={[
                          styles.locAddrRow,
                          isActive && styles.locAddrRowActive,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.locAddrTouchable}
                          onPress={() => void selectSavedAddress(addr)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.locAddrIcon, isActive && styles.locAddrIconActive]}>
                            <Ionicons
                              name={iconName}
                              size={18}
                              color={isActive ? colors.white : colors['ink-muted']}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.locAddrLabel}>{addr.label}</Text>
                            <Text style={styles.locAddrText} numberOfLines={1}>{addr.address_text}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.locAddrDelete}
                          onPress={() => void deleteSavedAddress(addr)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors['ink-hint']} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── LABEL DIALOG MODAL (after map confirmation) ── */}
      <Modal visible={showLabelDialog} animationType="fade" transparent>
        <View style={styles.labelModalOverlay}>
          <View style={styles.labelModalCard}>
            <Text style={styles.labelModalTitle}>Guardar dirección como...</Text>
            {pendingLocation && (
              <Text style={styles.labelModalAddress} numberOfLines={2}>
                📍 {pendingLocation.address}
              </Text>
            )}

            <View style={styles.labelOptions}>
              {(['Casa', 'Trabajo', 'Otro'] as const).map((opt) => {
                const isSelected = selectedLabel === opt;
                const icon = opt === 'Casa' ? 'home' : opt === 'Trabajo' ? 'briefcase' : 'location';
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.labelOption, isSelected && styles.labelOptionActive]}
                    onPress={() => setSelectedLabel(opt)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={isSelected ? colors.white : colors.agave}
                    />
                    <Text style={[styles.labelOptionText, isSelected && styles.labelOptionTextActive]}>
                      {opt === 'Casa' ? '🏠 Casa' : opt === 'Trabajo' ? '💼 Trabajo' : '📍 Otro'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedLabel === 'Otro' && (
              <TextInput
                style={styles.labelCustomInput}
                placeholder="Nombre de la dirección"
                placeholderTextColor={colors['ink-hint']}
                value={customLabel}
                onChangeText={setCustomLabel}
                autoFocus
              />
            )}

            <View style={styles.labelActions}>
              <TouchableOpacity
                style={styles.labelCancelBtn}
                onPress={() => {
                  setShowLabelDialog(false);
                  setPendingLocation(null);
                }}
              >
                <Text style={styles.labelCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.labelSaveBtn}
                onPress={() => void saveLabeledAddress()}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.labelSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  // ── Location banner ──
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors['agave-light'],
  },
  locationLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: colors['ink-muted'],
  },
  locationValue: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  // ── Location modal ──
  locModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '70%',
  },
  locModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locModalTitle: {
    ...textStyles.h2,
    color: colors.ink,
  },
  locGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.agave,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locGpsBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.white,
  },
  locSavedTitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-muted'],
    marginBottom: spacing.sm,
  },
  locAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  locAddrRowActive: {
    backgroundColor: colors['agave-light'],
  },
  locAddrLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  locAddrText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  locAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.agave,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  locAddBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.agave,
  },
  locAddrTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  locAddrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.snow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locAddrIconActive: {
    backgroundColor: colors.agave,
  },
  locAddrDelete: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  // ── Label dialog ──
  labelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  labelModalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  labelModalTitle: {
    ...textStyles.h3,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  labelModalAddress: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  labelOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  labelOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors['agave-light'],
    backgroundColor: colors.snow,
    minWidth: 80,
  },
  labelOptionActive: {
    backgroundColor: colors.agave,
    borderColor: colors.agave,
  },
  labelOptionText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors.agave,
    marginTop: spacing.xs,
  },
  labelOptionTextActive: {
    color: colors.white,
  },
  labelCustomInput: {
    borderWidth: 2,
    borderColor: colors['agave-light'],
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  labelActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  labelCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelCancelText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors['ink-muted'],
  },
  labelSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.agave,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelSaveText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.white,
  },
  greeting: {
    ...textStyles.h1,
    color: colors.ink,
    paddingTop: spacing.md,
  },
  subtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.snow,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    height: 46,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
  },
  // Category icons row
  categoryRow: {
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryCircleActive: {
    backgroundColor: colors['agave-light'],
    borderWidth: 2,
    borderColor: colors.agave,
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors['ink-secondary'],
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.agave,
    fontFamily: fonts.outfit.bold,
  },
  // Featured carousel
  carouselSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...textStyles.h3,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  carouselList: {
    gap: CAROUSEL_CARD_GAP,
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    height: 170,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.md,
  },
  carouselInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  carouselName: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.white,
  },
  carouselMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  carouselType: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  carouselDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  carouselDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  closedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  closedText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.white,
  },
  // Restaurant list
  list: {
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  restaurantCard: {
    padding: 0,
    overflow: 'hidden',
  },
  restaurantImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.cloud,
  },
  restaurantImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    padding: spacing.md,
  },
  restaurantName: {
    ...textStyles.h3,
    color: colors.ink,
  },
  restaurantDesc: {
    ...textStyles.caption,
    color: colors['ink-secondary'],
    marginTop: 2,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  metaText: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors['ink-hint'],
  },
  loader: {
    marginTop: spacing['4xl'],
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  emptyText: {
    ...textStyles.body,
    color: colors['ink-muted'],
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  // Active order banner
  activeBanner: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  activeBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.agave,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  activeBannerPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  activeBannerContent: {
    flex: 1,
  },
  activeBannerTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.white,
  },
  activeBannerStatus: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
});
