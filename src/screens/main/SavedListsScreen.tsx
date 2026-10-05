import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import * as savedListsService from '../../services/savedLists';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { SavedList, OrderItemJSON } from '../../types/database';

type RouteType = RouteProp<RootStackParamList, 'SavedLists'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

export const SavedListsScreen: React.FC = () => {
  const navigation = useNavigation<NavType>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { addItem } = useCart();

  const { restaurantId, restaurantName } = route.params ?? {};
  const [lists, setLists] = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    if (!profile?.phone) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = restaurantId ? await savedListsService.getSavedListsByRestaurant(profile.phone, restaurantId) : await savedListsService.getSavedLists(profile.phone);
      setLists(data);
    } catch (err) {
      console.error('[PideYa] Fetch saved lists error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.phone, restaurantId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleToggleFavorite = async (list: SavedList) => {
    try {
      await savedListsService.toggleFavorite(list.id, list.is_favorite);
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, is_favorite: !l.is_favorite } : l));
    } catch {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleDelete = (list: SavedList) => {
    Alert.alert(
      'Eliminar lista',
      `¿Eliminar "${list.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await savedListsService.deleteSavedList(list.id);
              setLists(prev => prev.filter(l => l.id !== list.id));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ],
    );
  };

  const handleReorder = (list: SavedList) => {
    Alert.alert(
      'Re-Orden Express',
      `¿Agregar ${list.items.length} items al carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '🛒 Agregar al carrito',
          onPress: () => {
            // Add items to cart
            list.items.forEach((item: OrderItemJSON) => {
              addItem(
                list.restaurant_id,
                restaurantName || list.name,
                {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  restaurant_id: list.restaurant_id,
                  description: null,
                  category: '',
                  photo_url_1: null,
                  photo_url_2: null,
                  is_promo: false,
                  promo_description: null,
                  is_combo: false,
                  combo_description: null,
                  available: true,
                  sort_order: 0,
                  sell_by_weight: false,
                  unit_type: 'unit',
                  price_per_unit: null,
                  min_quantity: 0.1,
                  step_quantity: 0.1,
                  allow_substitution: true,
                  created_at: '',
                  updated_at: '',
                },
                item.quantity,
                item.notes || '',
                [],
              );
            });
            navigation.navigate('Cart');
          },
        },
      ],
    );
  };

  const renderList = ({ item: list }: { item: SavedList }) => {
    const itemCount = list.items.length;
    const totalEstimate = list.items.reduce((s: number, i: OrderItemJSON) => s + i.price * i.quantity, 0);
    const dateStr = list.last_used_at
      ? new Date(list.last_used_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '';

    return (
      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <TouchableOpacity onPress={() => handleToggleFavorite(list)}>
            <Ionicons
              name={list.is_favorite ? 'star' : 'star-outline'}
              size={22}
              color={list.is_favorite ? '#F9A825' : colors['ink-secondary']}
            />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.listName}>{list.name}</Text>
            <Text style={styles.listMeta}>{itemCount} items · ~${totalEstimate.toFixed(0)} · {dateStr}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(list)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Items preview */}
        <View style={styles.itemsPreview}>
          {list.items.slice(0, 5).map((item: OrderItemJSON, idx: number) => (
            <Text key={idx} style={styles.previewItem}>
              {item.quantity}x {item.name}
            </Text>
          ))}
          {list.items.length > 5 && (
            <Text style={styles.previewMore}>+{list.items.length - 5} más</Text>
          )}
        </View>

        {/* Reorder Button */}
        <TouchableOpacity style={styles.reorderBtn} onPress={() => handleReorder(list)}>
          <Ionicons name="cart" size={18} color="#fff" />
          <Text style={styles.reorderBtnText}>Re-Ordenar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mis Listas</Text>
          <Text style={styles.headerSub}>{restaurantName || 'Todos tus establecimientos'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.agave} />
        </View>
      ) : lists.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <Ionicons name="list-outline" size={64} color={colors.silver} />
          <Text style={{ ...textStyles.h3, color: colors['ink-secondary'], marginTop: spacing.md, textAlign: 'center' }}>
            No tienes listas guardadas
          </Text>
          <Text style={{ ...textStyles.body, color: colors['ink-secondary'], marginTop: spacing.xs, textAlign: 'center' }}>
            Cuando hagas pedidos con 3+ items, se guardarán automáticamente aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          renderItem={renderList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.silver,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.snow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: { ...textStyles.h2 },
  headerSub: { ...textStyles.caption, color: colors['ink-secondary'] },
  listCard: {
    backgroundColor: colors.snow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.silver,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listName: { ...textStyles.body, fontWeight: '700' },
  listMeta: { ...textStyles.caption, color: colors['ink-secondary'], marginTop: 2 },
  itemsPreview: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.silver,
  },
  previewItem: { ...textStyles.caption, color: colors.ink, paddingVertical: 2 },
  previewMore: { ...textStyles.caption, color: colors.agave, marginTop: 2, fontWeight: '600' },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.agave,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  reorderBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
