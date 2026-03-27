import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderById, subscribeToOrderStatus } from '../../services/orders';
import { notifyOrderStatusChange } from '../../hooks/useNotifications';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Order, OrderStatus } from '../../types/database';

type RouteType = RouteProp<RootStackParamList, 'OrderStatus'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PENDING', label: 'Pedido enviado', icon: 'checkmark-circle' },
  { status: 'ACCEPTED', label: 'Restaurante preparando', icon: 'restaurant' },
  { status: 'ON_THE_WAY', label: 'En camino', icon: 'bicycle' },
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

  useEffect(() => {
    getOrderById(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = subscribeToOrderStatus(orderId, (updated) => {
      setOrder((prev) => {
        // Send local notification when status actually changes
        if (prev && prev.status !== updated.status) {
          notifyOrderStatusChange(updated.status, updated.order_number);
        }
        return updated;
      });
    });
    return unsub;
  }, [orderId]);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{order.order_number}</Text>
        <View style={{ width: 24 }} />
      </View>

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

      {/* Back to home */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
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
    flex: 1,
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
