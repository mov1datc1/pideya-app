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
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { cancelOrder } from '../../services/orders';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { formatPrice } from '../../utils/formatPrice';
import type { Order } from '../../types/database';
import type { RootStackParamList } from '../../types/navigation';

type Tab = 'active' | 'history';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'ON_THE_WAY'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Preparando',
  ON_THE_WAY: 'En camino',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.warning,
  ACCEPTED: colors.agave,
  ON_THE_WAY: colors.tierra,
  DELIVERED: colors['agave-dark'],
  REJECTED: colors.error,
  CANCELLED: colors['ink-muted'],
};

export const OrdersScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { orders, loading, error, refresh } = useOrders(phone);
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
    // Cash payment + already accepted = no cancel
    const paymentMethod = order.payment_method;
    if (paymentMethod === 'cash' && order.status !== 'PENDING') {
      Alert.alert(
        'No se puede cancelar',
        'Los pedidos con pago en efectivo no pueden cancelarse despues de ser aceptados por el restaurante.',
      );
      return;
    }

    // Card payment + accepted = charge 30%
    const isAccepted = order.status !== 'PENDING';
    const cardWarning = paymentMethod === 'card' && isAccepted
      ? '\n\nSe aplicara un cargo del 30% del costo del pedido (sin envio).'
      : '';

    Alert.alert(
      'Cancelar pedido',
      `Seguro que quieres cancelar el pedido #${order.order_number}?${cardWarning}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(order.id);
            try {
              await cancelOrder(order.id);
              refresh();
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el pedido.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const navigateToOrder = (order: Order) => {
    navigation.navigate('OrderStatus', { orderId: order.id });
  };

  /** Can this order be cancelled? */
  const canCancel = (order: Order) => {
    if (order.status === 'PENDING') return true;
    const paymentMethod = order.payment_method;
    // Cash: only PENDING can cancel
    if (paymentMethod === 'cash') return false;
    // Card: can cancel up to ON_THE_WAY (with 30% fee)
    if (paymentMethod === 'card' && ACTIVE_STATUSES.includes(order.status)) return true;
    return false;
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => navigateToOrder(item)}>
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>{item.reference_code}</Text>
            <Text style={styles.orderNumSub}>Pedido #{item.order_number}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] ?? colors['ink-muted'] },
            ]}
          >
            <Text style={styles.statusText}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.orderItems} numberOfLines={2}>
          {item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
        </Text>
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>{formatPrice(item.total)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('es-MX')}
          </Text>
        </View>
        {/* Cancel button — only for active orders with appropriate logic */}
        {tab === 'active' && canCancel(item) && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={(e) => { e.stopPropagation?.(); handleCancel(item); }}
            disabled={cancellingId === item.id}
          >
            {cancellingId === item.id ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Text style={styles.cancelBtnText}>Cancelar pedido</Text>
            )}
          </TouchableOpacity>
        )}
        {/* Navigate arrow for history */}
        {tab === 'history' && (
          <View style={styles.arrowRow}>
            <Text style={styles.detailHint}>Ver detalle</Text>
            <Ionicons name="chevron-forward" size={16} color={colors['ink-hint']} />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Inicia sesion para ver tus pedidos
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Mis pedidos</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Activos
          </Text>
          {activeOrders.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activeOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.agave} style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={displayedOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={tab === 'active' ? 'receipt-outline' : 'time-outline'}
                size={48}
                color={colors['ink-hint']}
              />
              <Text style={styles.emptyText}>
                {tab === 'active'
                  ? 'No tienes pedidos activos'
                  : 'Aun no tienes pedidos anteriores'}
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    ...textStyles.h1,
    color: colors.ink,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomColor: colors.agave,
  },
  tabText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors['ink-muted'],
  },
  tabTextActive: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.agave,
  },
  tabBadge: {
    backgroundColor: colors.agave,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    color: colors.white,
  },
  // List
  list: {
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  orderCard: {
    gap: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  orderNumSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: colors.white,
  },
  orderItems: {
    ...textStyles.caption,
    color: colors['ink-secondary'],
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontFamily: fonts.playfair.semiBold,
    fontSize: 17,
    color: colors.ink,
  },
  orderDate: {
    ...textStyles.caption,
    color: colors['ink-muted'],
  },
  cancelBtn: {
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors.error,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.xs,
  },
  detailHint: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors['ink-hint'],
  },
  // Empty states
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...textStyles.body,
    color: colors['ink-muted'],
    textAlign: 'center',
    marginTop: spacing.sm,
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
});
