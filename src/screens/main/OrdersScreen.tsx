import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useCart } from '../../hooks/useCart';
import { cancelOrder } from '../../services/orders';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { formatPrice } from '../../utils/formatPrice';
import type { Order } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

import { ACTIVE_ORDER_STATUSES as ACTIVE_STATUSES, ORDER_STATUS_LABELS as STATUS_LABELS } from '../../utils/orderStatus';

type Tab = 'active' | 'history';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: colors.agave,
  PICKING: colors.agave,
  ADJUSTED: '#F59E0B',
  ON_THE_WAY: '#3B82F6',
  DELIVERED: '#10B981',
  REJECTED: colors.error,
  CANCELLED: colors['ink-muted'],
};

export const OrdersScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { orders, loading, error, refresh, loadMore, hasMore, loadingMore } = useOrders(phone);
  const { addItem, clearCart } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('active');

  const activeOrders = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  const historyOrders = useMemo(
    () => orders.filter((o) => !ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  const displayedOrders = tab === 'active' ? activeOrders : historyOrders;

  const handleCancel = (order: Order) => {
    const paymentMethod = order.payment_method;
    const currentStatus = order.status;

    if (paymentMethod === 'cash' && currentStatus !== 'PENDING') {
      Alert.alert(
        'No se puede cancelar',
        'Los pedidos con pago en efectivo no pueden cancelarse después de ser aceptados por el establecimiento.',
      );
      return;
    }

    Alert.alert(
      'Cancelar pedido',
      `¿Seguro que quieres cancelar el pedido #${order.order_number}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(order.id);
            try {
              await cancelOrder(order.id, currentStatus, paymentMethod);
              refresh();
            } catch (err: any) {
              const msg = err?.message || 'No se pudo cancelar el pedido.';
              Alert.alert('Error al cancelar', msg);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const handleReorder = (order: Order) => {
    const rName = (order as any).restaurant_name || (order as any).restaurants?.name || 'Establecimiento';
    Alert.alert(
      'Repetir Pedido',
      `¿Deseas agregar los productos de tu pedido en "${rName}" al carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Agregar al Carrito',
          onPress: () => {
            clearCart();
            order.items.forEach((item) => {
              addItem(
                order.restaurant_id,
                rName,
                {
                  id: item.id,
                  restaurant_id: order.restaurant_id,
                  name: item.name,
                  price: item.price,
                  created_at: new Date().toISOString(),
                } as any,
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

  const navigateToOrderTrack = (order: Order) => {
    navigation.navigate('OrderStatus', { orderId: order.id });
  };

  const getItemsSummary = (items: any) => {
    if (!items) return '';
    try {
      const list = Array.isArray(items) ? items : typeof items === 'string' ? JSON.parse(items) : [];
      return list.map((i: any) => `${i.quantity || 1}x ${i.name || i.title || 'Producto'}`).join(', ');
    } catch {
      return '';
    }
  };

  const renderActiveOrder = (order: Order) => (
    <View key={order.id} style={styles.activeOrderCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.storeBadgeCircle}>
          <Ionicons name="flash-sharp" size={20} color={colors.agave} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeNameTitle}>
            {(order as any).restaurant_name || (order as any).restaurants?.name || 'Establecimiento'}
          </Text>
          <Text style={styles.orderRefSub}>Pedido #{order.order_number}</Text>
        </View>

        <View style={[styles.statusChipActive, { backgroundColor: (STATUS_COLORS[order.status] ?? colors.agave) + '20' }]}>
          <View style={[styles.pulsingDot, { backgroundColor: STATUS_COLORS[order.status] }]} />
          <Text style={[styles.statusChipActiveText, { color: STATUS_COLORS[order.status] }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      <Text style={styles.itemSummaryText} numberOfLines={2}>
        {getItemsSummary(order.items)}
      </Text>

      <View style={styles.cardFooterRow}>
        <Text style={styles.orderPriceTotal}>{formatPrice(order.total)}</Text>
        <Text style={styles.orderTimeText}>
          {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* Main Action: Rastrear en Vivo */}
      <TouchableOpacity
        style={styles.trackLiveBtn}
        onPress={() => navigateToOrderTrack(order)}
        activeOpacity={0.88}
      >
        <Ionicons name="navigate-sharp" size={18} color={colors.white} />
        <Text style={styles.trackLiveBtnText}>Rastrear en Vivo</Text>
      </TouchableOpacity>

      {order.status === 'PENDING' && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel(order)}
          disabled={cancellingId === order.id}
        >
          {cancellingId === order.id ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancelar pedido</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHistoryOrder = ({ item }: { item: Order }) => (
    <View style={styles.historyOrderCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.storeBadgeCircleGray}>
          <Ionicons name="basket-outline" size={20} color={colors['ink-secondary']} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeNameTitle}>
            {(item as any).restaurant_name || (item as any).restaurants?.name || 'Establecimiento'}
          </Text>
          <Text style={styles.orderDateSub}>
            {new Date(item.created_at).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.statusChipHistory}>
          <Text style={styles.statusChipHistoryText}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.itemSummaryText} numberOfLines={2}>
        {getItemsSummary(item.items)}
      </Text>

      <View style={styles.historyFooterRow}>
        <Text style={styles.orderPriceTotal}>{formatPrice(item.total)}</Text>

        <TouchableOpacity
          style={styles.reorderBtn}
          onPress={() => handleReorder(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-sharp" size={16} color={colors.agave} />
          <Text style={styles.reorderBtnText}>Repetir Pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyTitle}>Inicia sesión para ver tus pedidos</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Text style={styles.screenTitle}>Mis Pedidos</Text>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
          onPress={() => setTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, tab === 'active' && styles.tabBtnTextActive]}>
            Activos ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => setTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
            Historial ({historyOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {error && <View accessibilityRole="alert" style={{ padding: spacing.md }}>
        <Text style={{ color: colors.error }}>{error}</Text>
        <TouchableOpacity onPress={refresh} accessibilityRole="button"><Text style={{ color: colors.agave, paddingVertical: spacing.md }}>Reintentar</Text></TouchableOpacity>
      </View>}
      {/* Orders List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.agave} style={{ marginTop: 40 }} />
      ) : displayedOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyTitle}>
            {tab === 'active' ? 'No tienes pedidos activos' : 'No tienes pedidos anteriores'}
          </Text>
        </View>
      ) : (
        <FlatList
          ListFooterComponent={tab === 'history' && hasMore ? <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={{ padding: spacing.lg }} accessibilityRole="button">
            {loadingMore ? <ActivityIndicator color={colors.agave} /> : <Text style={{ color: colors.agave, textAlign: 'center' }}>Ver pedidos anteriores</Text>}
          </TouchableOpacity> : null}
          data={displayedOrders}
          renderItem={tab === 'active' ? ({ item }) => renderActiveOrder(item) : renderHistoryOrder}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.agave,
  },
  tabBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors['ink-secondary'],
  },
  tabBtnTextActive: {
    fontFamily: fonts.outfit.bold,
    color: colors.white,
  },
  activeOrderCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.agave,
    elevation: 3,
    shadowColor: '#2D8B7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  historyOrderCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  storeBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeBadgeCircleGray: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeNameTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.ink,
  },
  orderRefSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  orderDateSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  statusChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipActiveText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
  },
  statusChipHistory: {
    backgroundColor: colors.snow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cloud,
  },
  statusChipHistoryText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors['ink-secondary'],
  },
  itemSummaryText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPriceTotal: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.ink,
  },
  orderTimeText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  trackLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    backgroundColor: colors.agave,
    borderRadius: radius.md,
  },
  trackLiveBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: colors.white,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors['agave-light'],
    borderWidth: 1,
    borderColor: colors.agave,
  },
  reorderBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: colors.agave,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  cancelBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors['ink-muted'],
  },
});
