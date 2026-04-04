import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import * as ordersService from '../../services/orders';
import * as availabilityService from '../../services/availability';
import { colors, spacing, radius } from '../../constants/theme';
import { timeAgo, formatPrice, statusLabel } from '../../utils/formatters';
import type { Order } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { driver, restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!driver) return;
    try {
      const data = await ordersService.getAssignedOrders(driver.id);
      setOrders(data);
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driver]);

  // Fetch availability state
  const fetchAvailability = useCallback(async () => {
    if (!driver) return;
    try {
      const status = await availabilityService.getDriverAvailability(driver.id);
      setIsAvailable(status.is_available);
      setCurrentOrderId(status.current_order_id);
    } catch {
      // Column might not exist yet if migration not run
    }
  }, [driver]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      fetchAvailability();
    }, [fetchOrders, fetchAvailability]),
  );

  // Real-time subscriptions
  useEffect(() => {
    if (!driver) return;

    const unsubOrders = ordersService.subscribeToDriverOrders(
      driver.id,
      (updatedOrder) => {
        setOrders((prev) => {
          const isActive =
            updatedOrder.status === 'ACCEPTED' ||
            updatedOrder.status === 'ON_THE_WAY';

          if (isActive) {
            const exists = prev.findIndex((o) => o.id === updatedOrder.id);
            if (exists >= 0) {
              const next = [...prev];
              next[exists] = updatedOrder;
              return next;
            }
            return [updatedOrder, ...prev];
          }
          return prev.filter((o) => o.id !== updatedOrder.id);
        });
      },
    );

    const unsubProfile = availabilityService.subscribeToDriverProfile(
      driver.id,
      (profile) => {
        setIsAvailable(profile.is_available);
        setCurrentOrderId(profile.current_order_id);
      },
    );

    return () => {
      unsubOrders();
      unsubProfile();
    };
  }, [driver]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchAvailability();
  };

  const handleToggleAvailable = async (value: boolean) => {
    setToggling(true);
    try {
      await availabilityService.toggleAvailable(value);
      setIsAvailable(value);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setToggling(false);
    }
  };

  const hasActiveDelivery = currentOrderId !== null ||
    orders.some((o) => o.status === 'ON_THE_WAY');

  const statusColor = (status: string) => {
    if (status === 'ON_THE_WAY') return colors.statusOnTheWay;
    if (status === 'ACCEPTED') return colors.statusAccepted;
    return colors.statusPending;
  };

  const canStartDelivery = (order: Order) => {
    if (order.status !== 'ACCEPTED') return false;
    return !hasActiveDelivery;
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const isOnTheWay = item.status === 'ON_THE_WAY';
    const canStart = canStartDelivery(item);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => {
          if (isOnTheWay) {
            navigation.navigate('ActiveDelivery', { orderId: item.id });
          } else {
            navigation.navigate('OrderDetail', { orderId: item.id });
          }
        }}
      >
        {/* Status badge */}
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.orderTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor(item.status) + '18' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor(item.status) },
              ]}
            />
            <Text
              style={[styles.statusText, { color: statusColor(item.status) }]}
            >
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Client info */}
        <View style={styles.clientRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.clientName}>{item.client_name || 'Cliente'}</Text>
        </View>

        {item.client_location_note && (
          <View style={styles.clientRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.noteText} numberOfLines={1}>
              {item.client_location_note}
            </Text>
          </View>
        )}

        {/* Items summary */}
        <View style={styles.itemsSummary}>
          <Text style={styles.itemsText}>
            {item.items.reduce((sum, i) => sum + i.quantity, 0)} producto
            {item.items.reduce((sum, i) => sum + i.quantity, 0) !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.totalText}>{formatPrice(item.total)}</Text>
        </View>

        {/* CTA */}
        <View style={styles.ctaRow}>
          {isOnTheWay ? (
            <>
              <View style={styles.activeBadge}>
                <View style={styles.activePulse} />
                <Text style={styles.activeBadgeText}>Entrega en curso</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.ctaText,
                  !canStart && styles.ctaTextDisabled,
                ]}
              >
                {canStart ? 'Ver detalle' : 'Completa la entrega actual'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canStart ? colors.primary : colors.textMuted}
              />
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Hola, {driver?.name?.split(' ')[0]}
            </Text>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          </View>
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{orders.length}</Text>
            <Text style={styles.orderCountLabel}>Activos</Text>
          </View>
        </View>

        {/* Availability toggle */}
        <View style={styles.availabilityBar}>
          <View style={styles.availabilityInfo}>
            <View
              style={[
                styles.availabilityDot,
                {
                  backgroundColor: isAvailable
                    ? colors.success
                    : colors.textMuted,
                },
              ]}
            />
            <View>
              <Text style={styles.availabilityTitle}>
                {isAvailable ? 'Disponible' : 'No disponible'}
              </Text>
              <Text style={styles.availabilitySubtitle}>
                {isAvailable
                  ? 'Estás recibiendo pedidos'
                  : 'No recibirás pedidos nuevos'}
              </Text>
            </View>
          </View>
          {toggling ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailable}
              trackColor={{
                false: 'rgba(255,255,255,0.2)',
                true: colors.success,
              }}
              thumbColor={colors.white}
              disabled={hasActiveDelivery && isAvailable}
            />
          )}
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={isAvailable ? 'bicycle-outline' : 'moon-outline'}
              size={64}
              color={colors.primaryLight}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isAvailable ? 'Sin pedidos asignados' : 'Estás desconectado'}
          </Text>
          <Text style={styles.emptyText}>
            {isAvailable
              ? 'Cuando el restaurante te asigne un pedido, aparecerá aquí automáticamente.'
              : 'Activa tu disponibilidad para empezar a recibir pedidos.'}
          </Text>
          {isAvailable && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.refreshText}>Actualizar</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl + spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.white },
  restaurantName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  orderCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  orderCountText: { fontSize: 24, fontWeight: '700', color: colors.white },
  orderCountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  // Availability
  availabilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  availabilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  availabilitySubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  // List
  list: { padding: spacing.md, gap: spacing.md },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  orderTime: { fontSize: 12, color: colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  noteText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  itemsText: { fontSize: 13, color: colors.textSecondary },
  totalText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: 4,
  },
  ctaText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  ctaTextDisabled: { color: colors.textMuted },
  activeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
});
