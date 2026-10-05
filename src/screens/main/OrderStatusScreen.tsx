import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderById, subscribeToOrderStatus, cancelOrder } from '../../services/orders';
import { subscribeToOrderTracking } from '../../services/tracking';
import { subscribeToPickingItems, confirmPickingSummary } from '../../services/picking';
import { notifyOrderStatusChange } from '../../hooks/useNotifications';
import { OrderTrackingMap } from '../../components/OrderTrackingMap';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Order, OrderStatus, OrderPickingItem } from '../../types/database';

type RouteType = RouteProp<RootStackParamList, 'OrderStatus'>;
type NavType = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_H } = Dimensions.get('window');

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PENDING', label: 'Pedido enviado', icon: 'checkmark-circle' },
  { status: 'ACCEPTED', label: 'Aceptado', icon: 'restaurant' },
  { status: 'PICKING', label: 'Surtiendo tu pedido', icon: 'basket' },
  { status: 'ADJUSTED', label: 'Pedido ajustado', icon: 'alert-circle' },
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
  const [confirmingPicking, setConfirmingPicking] = useState(false);
  const [pickingItems, setPickingItems] = useState<OrderPickingItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ eta: string | null; distance: string | null }>({
    eta: null,
    distance: null,
  });

  useEffect(() => {
    getOrderById(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsubStatus = subscribeToOrderStatus(orderId, (updated) => {
      setOrder((prev) => {
        if (prev && prev.status !== updated.status) {
          notifyOrderStatusChange(updated.status, updated.order_number);
        }
        return prev ? { ...prev, ...updated } : updated;
      });
    });
    const unsubTracking = subscribeToOrderTracking(orderId, (updated) => {
      setOrder(prev => prev ? { ...prev, ...updated } : updated);
    });
    return () => {
      unsubStatus();
      unsubTracking();
    };
  }, [orderId]);

  const handleCancel = () => {
    const paymentMethod = order!.payment_method;
    const currentStatus = order!.status;
    const isAfterPending = currentStatus !== 'PENDING';

    if (paymentMethod === 'cash' && isAfterPending) {
      Alert.alert(
        'No se puede cancelar',
        'Los pedidos con pago en efectivo no pueden cancelarse despues de ser aceptados por el restaurante.',
      );
      return;
    }

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
              const updated = await cancelOrder(orderId, currentStatus, paymentMethod);
              setOrder(prev => prev ? { ...prev, ...updated } : updated);
            } catch (err: any) {
              const msg = err?.message || 'No se pudo cancelar el pedido.';
              Alert.alert('Error al cancelar', msg);
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
  const isPicking = order?.status === 'PICKING';
  const isAdjusted = order?.status === 'ADJUSTED';
  const steps = STATUS_STEPS.filter(step => (order?.picking_preferences || order?.status === 'PICKING' || order?.status === 'ADJUSTED') || !['PICKING', 'ADJUSTED'].includes(step.status));
  const currentIdx = steps.findIndex(step => step.status === order?.status);

  // Subscribe to picking items when in PICKING or ADJUSTED status
  useEffect(() => {
    if (!order || (order.status !== 'PICKING' && order.status !== 'ADJUSTED')) return;
    const unsub = subscribeToPickingItems(order.id, setPickingItems);
    return unsub;
  }, [order?.id, order?.status]);

  const handleConfirmPicking = async () => {
    if (!order) return;
    setConfirmingPicking(true);
    try {
      await confirmPickingSummary(order.id);
    } catch {
      Alert.alert('Error', 'No se pudo confirmar el pedido');
    } finally {
      setConfirmingPicking(false);
    }
  };

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
  const showMap = order.delivery_type !== 'pickup' && isActive && (order.status === 'ACCEPTED' || order.status === 'ON_THE_WAY' || order.status === 'PICKING');

  // Cancel Button Logic
  const canCancel = (() => {
    if (isRejected || isCancelled || isDelivered) return false;
    if (order.payment_method === 'cash' && order.status !== 'PENDING') return false;
    return true;
  })();

  if (showMap) {
    return (
      <View style={styles.container}>
        {/* Full Screen Map */}
        <OrderTrackingMap
          restaurantLat={(order as any).restaurants?.lat ?? null}
          restaurantLng={(order as any).restaurants?.lng ?? null}
          restaurantName={(order as any).restaurants?.name}
          clientLat={order.client_lat || 0}
          clientLng={order.client_lng || 0}
          driverLat={order.driver_last_lat ?? null}
          driverLng={order.driver_last_lng ?? null}
          driverName={order.delivery_driver_name}
          driverUpdatedAt={order.driver_location_updated_at}
          status={order.status}
          onRouteInfo={(eta, distance) => setRouteInfo({ eta, distance })}
        />

        {/* Floating Header */}
        <View style={[styles.floatingHeader, { top: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.floatingBackBtn} onPress={() => navigation.navigate('Main')}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Floating ETA Pill (If Available) */}
        {routeInfo.eta && (
          <View style={[styles.floatingEtaPill, { top: insets.top + spacing.sm }]}>
            <Ionicons name="time" size={16} color={colors.agave} />
            <Text style={styles.etaValue}>{routeInfo.eta}</Text>
            {routeInfo.distance && (
              <>
                <View style={styles.etaDivider} />
                <Text style={styles.etaDistance}>{routeInfo.distance}</Text>
              </>
            )}
          </View>
        )}

        {/* Scrollable Bottom Sheet */}
        <ScrollView
          style={StyleSheet.absoluteFillObject}
          contentContainerStyle={{
            paddingTop: isCollapsed ? SCREEN_H - (insets.bottom + 140) : SCREEN_H * 0.42,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            {/* Interactive Sheet Handle & Minimizer Toggle */}
            <TouchableOpacity
              style={styles.sheetHandleArea}
              onPress={() => setIsCollapsed(!isCollapsed)}
              activeOpacity={0.8}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.handleToggleRow}>
                <Ionicons
                  name={isCollapsed ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={18}
                  color={colors.agave}
                />
                <Text style={styles.handleToggleText}>
                  {isCollapsed ? 'Ver detalle del pedido 📋' : 'Minimizar para ver mapa completo 🗺️'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Status Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.statusCircle}>
                <Ionicons
                  name={steps[currentIdx]?.icon as keyof typeof Ionicons.glyphMap || 'time'}
                  size={28}
                  color={colors.agave}
                />
              </View>
              <View style={styles.sheetTitleCol}>
                <Text style={styles.sheetStatusTitle}>
                  {steps[currentIdx]?.label || order.status}
                </Text>
                <Text style={styles.sheetOrderRef}>
                  Pedido {order.reference_code}
                </Text>
              </View>
            </View>

            {/* Driver Card */}
            {order.delivery_driver_name && (
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

            {/* Stepper */}
            <View style={styles.stepsContainer}>
              {steps.map((step, idx) => {
                const isDone = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <View key={step.status} style={styles.stepRow}>
                    <View style={styles.stepIndicatorCol}>
                      <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                        {isDone && <Ionicons name="checkmark" size={12} color={colors.white} />}
                      </View>
                      {idx < steps.length - 1 && (
                        <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Details Section */}
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

            {/* Actions */}
            <View style={styles.bottomActions}>
              {canCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
                  {cancelling ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.cancelBtnText}>
                      {order.status === 'PENDING' ? 'Cancelar pedido' : 'Cancelar pedido (con cargo)'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Non-Map UI (Pending, Cancelled, Delivered)
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.reference_code}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.statusArea}>
          {isRejected || isCancelled ? (
            <View style={styles.rejectedContainer}>
              <Ionicons name={isRejected ? 'close-circle' : 'ban'} size={56} color={colors.error} />
              <Text style={styles.rejectedTitle}>{isRejected ? 'Pedido rechazado' : 'Pedido cancelado'}</Text>
              {order.rejection_reason && <Text style={styles.rejectedReason}>{order.rejection_reason}</Text>}
            </View>
          ) : isDelivered ? (
            <View style={styles.deliveredContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.agave} />
              <Text style={styles.deliveredTitle}>¡Pedido entregado!</Text>
              <Text style={styles.deliveredSubtitle}>¡Buen provecho!</Text>
            </View>
          ) : (
            <View style={styles.activeContainer}>
              <View style={styles.pulseCircleLarge}>
                <Ionicons name={isPicking ? 'basket' : isAdjusted ? 'alert-circle' : 'time'} size={32} color={colors.agave} />
              </View>
              <Text style={styles.activeStatusLarge}>
                {isPicking ? 'Están surtiendo tu pedido...' : isAdjusted ? 'Tu pedido fue ajustado' : 'Esperando confirmación...'}
              </Text>
            </View>
          )}
        </View>

        {!isRejected && !isCancelled && !isDelivered && (
          <View style={styles.stepsContainer}>
            {steps.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <View key={step.status} style={styles.stepRow}>
                  <View style={styles.stepIndicatorCol}>
                    <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                      {isDone && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    </View>
                    {idx < steps.length - 1 && (
                      <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        {/* ── PICKING SUMMARY (when ADJUSTED) ── */}
        {isAdjusted && pickingItems.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.snow, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.silver }}>
            <Text style={{ ...textStyles.h3, marginBottom: spacing.sm }}>📋 Resumen del surtido</Text>
            {pickingItems.map((pi) => (
              <View key={pi.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.silver }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>
                  {pi.status === 'PICKED' ? '✅' : pi.status === 'ADJUSTED' ? '⚠️' : pi.status === 'UNAVAILABLE' ? '❌' : pi.status === 'SUBSTITUTED' ? '🔄' : '⏳'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...textStyles.body, fontWeight: '600' }}>
                    {pi.status === 'SUBSTITUTED' ? pi.substitute_name : pi.requested_name}
                  </Text>
                  <Text style={{ ...textStyles.caption, color: colors['ink-secondary'] }}>
                    {pi.status === 'UNAVAILABLE' ? 'No disponible'
                      : pi.status === 'SUBSTITUTED' ? `Sustituye: ${pi.requested_name}`
                      : pi.status === 'ADJUSTED' ? `${pi.picked_quantity} ${pi.requested_unit} (pediste ${pi.requested_quantity})`
                      : `${pi.picked_quantity || pi.requested_quantity} ${pi.requested_unit}`
                    }
                  </Text>
                </View>
                <Text style={{ ...textStyles.body, fontWeight: '700', color: pi.status === 'UNAVAILABLE' ? colors.error : colors.ink }}>
                  {pi.status === 'UNAVAILABLE' ? '-' : `$${(pi.picked_price || pi.requested_price).toFixed(2)}`}
                </Text>
              </View>
            ))}

            {/* Totals */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
              <Text style={{ ...textStyles.caption, color: colors['ink-secondary'] }}>Total original</Text>
              <Text style={{ ...textStyles.caption, color: colors['ink-secondary'], textDecorationLine: 'line-through' }}>${order.total.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ ...textStyles.body, fontWeight: '800' }}>Total ajustado</Text>
              <Text style={{ ...textStyles.body, fontWeight: '800', color: colors.agave }}>${(order.adjusted_total || order.total).toFixed(2)}</Text>
            </View>

            {/* Accept / Cancel */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.agave, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' }}
                onPress={handleConfirmPicking}
                disabled={confirmingPicking}
              >
                {confirmingPicking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>✅ Aceptar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.error, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' }}
                onPress={handleCancel}
                disabled={cancelling}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>❌ Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Text style={styles.cancelBtnText}>
                {order.status === 'PENDING' ? 'Cancelar pedido' : 'Cancelar pedido (con cargo)'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.homeBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
  },
  // Floating Map UI
  floatingHeader: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 10,
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  floatingEtaPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  etaValue: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: '#1A1D21',
  },
  etaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  etaDistance: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#757575',
  },
  // Bottom Sheet
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 15,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#D0D5DD',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 4,
  },
  handleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  handleToggleText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.agave,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitleCol: {
    marginLeft: spacing.md,
  },
  sheetStatusTitle: {
    fontFamily: fonts.playfair.bold,
    fontSize: 22,
    color: colors.ink,
  },
  sheetOrderRef: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors['ink-muted'],
    marginTop: 2,
  },
  // Static UI Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.ink,
  },
  // Status Area
  statusArea: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.white,
  },
  pulseCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeStatusLarge: {
    fontFamily: fonts.playfair.bold,
    fontSize: 24,
    color: colors.ink,
  },
  activeContainer: { alignItems: 'center' },
  rejectedContainer: { alignItems: 'center' },
  rejectedTitle: { ...textStyles.h2, color: colors.error, marginTop: spacing.md },
  rejectedReason: { ...textStyles.body, color: colors['ink-secondary'], marginTop: spacing.sm, textAlign: 'center' },
  deliveredContainer: { alignItems: 'center' },
  deliveredTitle: { fontFamily: fonts.playfair.bold, fontSize: 26, color: colors.agave, marginTop: spacing.md },
  deliveredSubtitle: { fontFamily: fonts.outfit.regular, fontSize: 16, color: colors['ink-secondary'], marginTop: spacing.xs },
  // Driver Card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.snow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: { flex: 1, marginLeft: spacing.md },
  driverName: { fontFamily: fonts.outfit.semiBold, fontSize: 16, color: colors.ink },
  driverLabel: { fontFamily: fonts.outfit.regular, fontSize: 13, color: colors['ink-muted'], marginTop: 2 },
  driverCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stepper
  stepsContainer: { paddingHorizontal: spacing['2xl'], marginBottom: spacing.xl, marginTop: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepIndicatorCol: { alignItems: 'center', width: 24, marginRight: spacing.md },
  stepDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cloud, justifyContent: 'center', alignItems: 'center' },
  stepDotDone: { backgroundColor: colors.agave },
  stepDotCurrent: { backgroundColor: colors.agave, borderWidth: 3, borderColor: colors['agave-soft'], width: 20, height: 20, borderRadius: 10 },
  stepLine: { width: 2, height: 28, backgroundColor: colors.cloud, marginVertical: 2 },
  stepLineDone: { backgroundColor: colors.agave },
  stepLabel: { fontFamily: fonts.outfit.medium, fontSize: 14, color: colors['ink-hint'], paddingTop: -2 },
  stepLabelDone: { color: colors.ink },
  stepLabelCurrent: { fontFamily: fonts.outfit.bold, color: colors.ink },
  // Details
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.white,
  },
  detailsTitle: { ...textStyles.h3, color: colors.ink, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  detailQty: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.agave, width: 32 },
  detailName: { fontFamily: fonts.outfit.regular, fontSize: 15, color: colors.ink, flex: 1 },
  detailPrice: { fontFamily: fonts.outfit.medium, fontSize: 15, color: colors.ink },
  detailTotalRow: { borderTopWidth: 1, borderTopColor: colors.cloud, paddingTop: spacing.md, marginTop: spacing.sm },
  detailTotalLabel: { fontFamily: fonts.outfit.bold, fontSize: 16, color: colors.ink, flex: 1 },
  detailTotalValue: { fontFamily: fonts.playfair.bold, fontSize: 20, color: colors.agave },
  // Actions
  bottomActions: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm, backgroundColor: colors.white },
  cancelBtn: { height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.error, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.outfit.semiBold, fontSize: 15, color: colors.error },
  homeBtn: { height: 50, borderRadius: radius.md, backgroundColor: colors.snow, justifyContent: 'center', alignItems: 'center' },
  homeBtnText: { fontFamily: fonts.outfit.semiBold, fontSize: 15, color: colors.ink },
});
