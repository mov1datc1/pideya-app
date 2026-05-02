import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderById, subscribeToOrderStatus, cancelOrder } from '../../services/orders';
import { subscribeToOrderTracking } from '../../services/tracking';
import { notifyOrderStatusChange } from '../../hooks/useNotifications';
import { OrderTrackingMap } from '../../components/OrderTrackingMap';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Order, OrderStatus } from '../../types/database';

type RouteType = RouteProp<RootStackParamList, 'OrderStatus'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PENDING', label: 'Pedido enviado', icon: 'checkmark-circle' },
  { status: 'ACCEPTED', label: 'Restaurante preparando', icon: 'restaurant' },
  { status: 'ON_THE_WAY', label: 'En camino', icon: 'navigate' },
  { status: 'DELIVERED', label: 'Entregado', icon: 'flag' },
];

const statusIndex = (status: OrderStatus) => {
  const idx = STATUS_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : -1;
};

export const OrderStatusScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getOrderById(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Subscribe to both order status and tracking (driver location)
    const unsubStatus = subscribeToOrderStatus(orderId, (updated) => {
      setOrder((prev) => {
        if (prev && prev.status !== updated.status) {
          notifyOrderStatusChange(updated.status, updated.order_number);
        }
        return updated;
      });
    });
    const unsubTracking = subscribeToOrderTracking(orderId, (updated) => {
      setOrder(updated);
    });
    return () => {
      unsubStatus();
      unsubTracking();
    };
  }, [orderId]);

  const handleCancel = () => {
    const paymentMethod = order!.payment_method;
    const isAfterPending = order!.status !== 'PENDING';

    // Cash + already accepted = can't cancel
    if (paymentMethod === 'cash' && isAfterPending) {
      Alert.alert(
        'No se puede cancelar',
        'Los pedidos con pago en efectivo no pueden cancelarse despues de ser aceptados por el restaurante.',
      );
      return;
    }

    // Card + after accepted = 30% penalty warning
    const cardWarning = paymentMethod === 'card' && isAfterPending
      ? '\n\nSe aplicara un cargo del 30% del costo del pedido (sin envio).'
      : '';

    Alert.alert(
      'Cancelar pedido',
      `Seguro que quieres cancelar este pedido?${cardWarning}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Si, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const updated = await cancelOrder(orderId);
              setOrder(updated);
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el pedido.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const isRejected = order?.status === 'REJECTED';
  const isCancelled = order?.status === 'CANCELLED';
  const isDelivered = order?.status === 'DELIVERED';
  const currentIdx = order ? statusIndex(order.status) : -1;

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.agave} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>No se encontro el pedido</Text>
      </View>
    );
  }

  const isActive = !isRejected && !isCancelled && !isDelivered;
  const showMap = isActive && (order.status === 'ACCEPTED' || order.status === 'ON_THE_WAY');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.reference_code}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Status animation area */}
        <View style={styles.statusArea}>
          {isRejected || isCancelled ? (
            <View style={styles.rejectedContainer}>
              <Ionicons
                name={isRejected ? 'close-circle' : 'ban'}
                size={80}
                color={colors.error}
              />
              <Text style={styles.rejectedTitle}>
                {isRejected ? 'Pedido rechazado' : 'Pedido cancelado'}
              </Text>
              {order.rejection_reason && (
                <Text style={styles.rejectedReason}>{order.rejection_reason}</Text>
              )}
            </View>
          ) : isDelivered ? (
            <View style={styles.deliveredContainer}>
              <Ionicons name="checkmark-circle" size={80} color={colors.agave} />
              <Text style={styles.deliveredTitle}>Pedido entregado!</Text>
              <Text style={styles.deliveredSubtitle}>Buen provecho!</Text>
            </View>
          ) : (
            <View style={styles.activeContainer}>
              <View style={styles.pulseCircle}>
                <Ionicons
                  name={STATUS_STEPS[currentIdx]?.icon as keyof typeof Ionicons.glyphMap || 'time'}
                  size={40}
                  color={colors.agave}
                />
              </View>
              <Text style={styles.activeStatus}>
                {STATUS_STEPS[currentIdx]?.label || order.status}
              </Text>
            </View>
          )}
        </View>

        {/* Live tracking map */}
        {showMap && (
          <OrderTrackingMap
            restaurantLat={(order as any).restaurants?.lat ?? null}
            restaurantLng={(order as any).restaurants?.lng ?? null}
            restaurantName={(order as any).restaurants?.name}
            clientLat={order.client_lat}
            clientLng={order.client_lng}
            driverLat={order.driver_last_lat}
            driverLng={order.driver_last_lng}
            driverName={order.delivery_driver_name}
            status={order.status}
          />
        )}

        {/* Driver info card — show for both ACCEPTED and ON_THE_WAY */}
        {(order.status === 'ACCEPTED' || order.status === 'ON_THE_WAY') && order.delivery_driver_name && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{order.delivery_driver_name}</Text>
              <Text style={styles.driverLabel}>Tu repartidor</Text>
            </View>
            {order.delivery_driver_phone && (
              <TouchableOpacity style={styles.driverCallBtn}>
                <Ionicons name="call" size={20} color={colors.agave} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Progress steps */}
        {!isRejected && !isCancelled && (
          <View style={styles.stepsContainer}>
            {STATUS_STEPS.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <View key={step.status} style={styles.stepRow}>
                  <View style={styles.stepIndicatorCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isDone && (
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      )}
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          isDone && styles.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isCurrent && styles.stepLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Order details */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Detalle del pedido</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.detailRow}>
              <Text style={styles.detailQty}>{item.quantity}x</Text>
              <Text style={styles.detailName}>{item.name}</Text>
              <Text style={styles.detailPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.detailRow, styles.detailTotalRow]}>
            <Text style={styles.detailTotalLabel}>Total</Text>
            <Text style={styles.detailTotalValue}>${order.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {/* Cancel button with smart payment logic */}
        {(() => {
          if (isRejected || isCancelled || isDelivered) return null;
          const paymentMethod = order.payment_method;
          // Cash: only PENDING can cancel
          if (paymentMethod === 'cash' && order.status !== 'PENDING') return null;
          // Otherwise show cancel for all active states
          return (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.cancelBtnText}>
                  {order.status === 'PENDING'
                    ? 'Cancelar pedido'
                    : 'Cancelar pedido (con cargo)'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })()}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.homeBtnText}>Volver al inicio</Text>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
  },
  // Status area
  statusArea: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  activeContainer: {
    alignItems: 'center',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  activeStatus: {
    ...textStyles.h2,
    color: colors.ink,
  },
  rejectedContainer: {
    alignItems: 'center',
  },
  rejectedTitle: {
    ...textStyles.h2,
    color: colors.error,
    marginTop: spacing.lg,
  },
  rejectedReason: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  deliveredContainer: {
    alignItems: 'center',
  },
  deliveredTitle: {
    ...textStyles.h2,
    color: colors.agave,
    marginTop: spacing.lg,
  },
  deliveredSubtitle: {
    ...textStyles.body,
    color: colors['ink-secondary'],
    marginTop: spacing.xs,
  },
  // Driver card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.ink,
  },
  driverLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
  },
  driverCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Steps
  stepsContainer: {
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 30,
    marginRight: spacing.md,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.agave,
  },
  stepDotCurrent: {
    backgroundColor: colors.agave,
    borderWidth: 3,
    borderColor: colors['agave-soft'],
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  stepLine: {
    width: 2,
    height: 30,
    backgroundColor: colors.cloud,
  },
  stepLineDone: {
    backgroundColor: colors.agave,
  },
  stepLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors['ink-hint'],
    paddingTop: 2,
  },
  stepLabelDone: {
    color: colors['ink-secondary'],
  },
  stepLabelCurrent: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.ink,
  },
  // Details
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailsTitle: {
    ...textStyles.h3,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailQty: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.agave,
    width: 30,
  },
  detailName: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  detailPrice: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-secondary'],
  },
  detailTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  detailTotalLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  detailTotalValue: {
    fontFamily: fonts.playfair.bold,
    fontSize: 18,
    color: colors.agave,
  },
  // Bottom
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  cancelBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.error,
  },
  homeBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.agave,
  },
});
