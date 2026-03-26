import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { LogoLockup } from '../../components/branding/LogoLockup';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { useRestaurants } from '../../hooks/useRestaurants';
import { useAuth } from '../../hooks/useAuth';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Restaurant, FoodType } from '../../types/database';

const FOOD_TYPES: { label: string; value: FoodType | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Tacos', value: 'TACOS' },
  { label: 'Birria', value: 'BIRRIA' },
  { label: 'Carnes', value: 'CARNES' },
  { label: 'Pollos', value: 'POLLOS' },
  { label: 'Mariscos', value: 'MARISCOS' },
  { label: 'Corrida', value: 'CORRIDA' },
  { label: 'Antojitos', value: 'ANTOJITOS' },
];

export const HomeScreen: React.FC = () => {
  const { profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurants, loading, error, search } = useRestaurants();
  const [selectedType, setSelectedType] = useState<FoodType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRestaurants =
    selectedType === 'ALL'
      ? restaurants
      : restaurants.filter((r) => r.type === selectedType);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    search(text);
  };

  const greeting = profile?.full_name
    ? `Hola, ${profile.full_name.split(' ')[0]}`
    : 'Buen dia';

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('RestaurantDetail', {
          restaurantId: item.id,
          restaurantName: item.name,
          coverUrl: item.cover_url || item.photo_url || undefined,
        })
      }
    >
      <Card style={styles.restaurantCard}>
        {(item.cover_url || item.photo_url) && (
          <Image
            source={{ uri: item.cover_url || item.photo_url || '' }}
            style={styles.restaurantImage}
          />
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

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <LogoLockup size="sm" />
      </View>

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
      </View>

      {/* Filters */}
      <FlatList
        data={FOOD_TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.value}
        contentContainerStyle={styles.chipList}
        renderItem={({ item }) => (
          <Chip
            label={item.label}
            selected={selectedType === item.value}
            onPress={() => setSelectedType(item.value)}
          />
        )}
      />

      {/* Restaurants */}
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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay restaurantes disponibles</Text>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.ink,
  },
  chipList: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
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
    height: 140,
    backgroundColor: colors.cloud,
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
});
