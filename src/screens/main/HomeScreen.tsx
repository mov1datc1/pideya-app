import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { LogoLockup } from '../../components/branding/LogoLockup';
import { Card } from '../../components/ui/Card';
import { useRestaurants } from '../../hooks/useRestaurants';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Restaurant, FoodType } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CAROUSEL_CARD_GAP = 12;

// Category icons with fun emojis for Los Altos de Jalisco food
const CATEGORIES: { label: string; value: FoodType | 'ALL'; emoji: string }[] = [
  { label: 'Todos', value: 'ALL', emoji: '🍽️' },
  { label: 'Tacos', value: 'TACOS', emoji: '🌮' },
  { label: 'Birria', value: 'BIRRIA', emoji: '🥘' },
  { label: 'Carnes', value: 'CARNES', emoji: '🥩' },
  { label: 'Pollos', value: 'POLLOS', emoji: '🍗' },
  { label: 'Mariscos', value: 'MARISCOS', emoji: '🦐' },
  { label: 'Corrida', value: 'CORRIDA', emoji: '🍲' },
  { label: 'Antojitos', value: 'ANTOJITOS', emoji: '🫔' },
];

export const HomeScreen: React.FC = () => {
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurants, loading, error, search } = useRestaurants();
  const [selectedType, setSelectedType] = useState<FoodType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { activeOrders } = useOrders(profile?.phone ?? '');
  const activeOrder = activeOrders[0] ?? null;

  // Banner animation
  const bannerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bannerAnim, {
      toValue: activeOrder ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeOrder]);

  const filteredRestaurants = useMemo(
    () =>
      selectedType === 'ALL'
        ? restaurants
        : restaurants.filter((r) => r.type === selectedType),
    [restaurants, selectedType],
  );

  // Featured: open restaurants with cover images (promos/popular)
  const featured = useMemo(
    () => restaurants.filter((r) => r.is_open && (r.cover_url || r.photo_url)).slice(0, 8),
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
    navigation.navigate('RestaurantDetail', {
      restaurantId: item.id,
      restaurantName: item.name,
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
      {!item.is_open && (
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
            {!item.is_open && (
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

  // Build a single scrollable data source with sections
  const ListHeader = () => (
    <>
      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subtitle}>Que se te antoja hoy?</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors['ink-hint']} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar restaurante..."
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
        {CATEGORIES.map((cat) => {
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
        {selectedType === 'ALL' ? 'Todos los restaurantes' : CATEGORIES.find(c => c.value === selectedType)?.label || 'Restaurantes'}
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
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
