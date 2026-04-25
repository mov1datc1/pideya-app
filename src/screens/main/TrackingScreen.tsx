import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTracking } from '../../hooks/useTracking';
import { OrderTrackingMap } from '../../components/OrderTrackingMap';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Esperando confirmacion',
  ACCEPTED: 'Preparando tu pedido',
  ON_THE_WAY: 'En camino',
  DELIVERED: 'Entregado',
};
const STATUS_ICONS: Record<string, string> = {
  PENDING: 'time-outline',
  ACCEPTED: 'restaurant-outline',
  ON_THE_WAY: 'bicycle',
  DELIVERED: 'checkmark-circle',
};

/** Estimate ETA based on distance (very rough: 30km/h average) */
const estimateETA = (
  driverLat: number | null,
  driverLng: number | null,
  clientLat: number,
  clientLng: number,
): string | null => {
  if (!driverLat || !driverLng || !clientLat || !clientLng) return null;
  const R = 6371; // km
  const dLat = ((clientLat - driverLat) * Math.PI) / 180;
  const dLon = ((clientLng - driverLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((driverLat * Math.PI) / 180) *
      Math.cos((clientLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = R * c;
  const minutes = Math.max(1, Math.round((distKm / 30) * 60)); // 30 km/h
  if (minutes <= 1) return '~1 min';
  return `~${minutes} min`;
};

export const TrackingScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { activeOrders, loading: ordersLoading } = useOrders(phone);

  const activeOrder = activeOrders[0] ?? null;

  // Persist the tracked orderId even after order becomes DELIVERED
  // (activeOrders removes DELIVERED orders, but we still want to track them)
  const trackedOrderIdRef = useRef<string | null>(null);
  if (activeOrder?.id) {
    trackedOrderIdRef.current = activeOrder.id;
  }

  const { order: trackedOrder, hasDriver, driverLat, driverLng, isDelivered } = useTracking(
    trackedOrderIdRef.current,
  );

  const currentOrder = trackedOrder ?? activeOrder;

  // Clear tracked ID when user has seen the delivered state
  // (after 30 seconds, reset so empty state shows)
  React.useEffect(() => {
    if (isDelivered) {
      const timer = setTimeout(() => {
        trackedOrderIdRef.current = null;
      }, 30_000);
      return () => clearTimeout(timer);
    }
  }, [isDelivered]);

  const eta = useMemo(
    () =>
      currentOrder?.status === 'ON_THE_WAY'
        ? estimateETA(driverLat, driverLng, currentOrder.client_lat, currentOrder.client_lng)
        : null,
    [driverLat, driverLng, currentOrder],
  );

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyText}>Inicia sesion para rastrear pedidos</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (ordersLoading) {
    return (
      <ScreenWrapper>
        <ActivityIndicator size="large" color={colors.agave} style={styles.loader} />
      </ScreenWrapper>
    );
  }

  if (!currentOrder) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Ionicons name="bicycle-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyText}>No tienes pedidos activos</Text>
          <Text style={styles.emptySubtext}>Cuando hagas un pedido, veras el rastreo aqui</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentStepIdx = STATUS_STEPS.indexOf(
    currentOrder.status as (typeof STATUS_STEPS)[number],
  );

  const showMap =
    currentOrder.status === 'ACCEPTED' || currentOrder.status === 'ON_THE_WAY';

  const handleCallDriver = () => {
    if (currentOrder.delivery_driver_phone) {
      Linking.openURL(`tel:${currentOrder.delivery_driver_phone}`);
    }
  };

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Rastreo</Text>

      {/* Live Map — large, interactive */}
      {showMap && (
        <OrderTrackingMap
          restaurantLat={null}
          restaurantLng={null}
          restaurantName={undefined}
          clientLat={currentOrder.client_lat}
          clientLng={currentOrder.client_lng}
          driverLat={driverLat}
          driverLng={driverLng}
          driverName={currentOrder.delivery_driver_name}
          status={currentOrder.status}
          interactive
        />
      )}

      {/* ETA pill */}
      {eta && currentOrder.status === 'ON_THE_WAY' && (
        <View style={styles.etaPill}>
          <Ionicons name="time" size={16} color={colors.agave} />
          <Text style={styles.etaText}>Llegada estimada: {eta}</Text>
        </View>
      )}

      {/* Driver info card */}
      {hasDriver && currentOrder.delivery_driver_name && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={22} color={colors.white} />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{currentOrder.delivery_driver_name}</Text>
            <Text style={styles.driverLabel}>Tu repartidor</Text>
          </View>
          {currentOrder.delivery_driver_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver}>
              <Ionicons name="call" size={18} color={colors.agave} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusIconCircle}>
          <Ionicons
            name={(STATUS_ICONS[currentOrder.status] ?? 'time') as keyof typeof Ionicons.glyphMap}
            size={24}
            color={colors.agave}
          />
        </View>
        <View>
          <Text style={styles.statusTitle}>
            {STATUS_LABELS[currentOrder.status] ?? currentOrder.status}
          </Text>
          <Text style={styles.statusSubtitle}>
            {currentOrder.reference_code} · Pedido #{currentOrder.order_number}
          </Text>
        </View>
      </View>

      {/* Progress steps */}
      <View style={styles.steps}>
        {STATUS_STEPS.map((step, i) => {
          const isActive = i <= currentStepIdx;
          const isCurrent = i === currentStepIdx;
          return (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepDot,
                    isActive && styles.stepDotActive,
                    isCurrent && styles.stepDotCurrent,
                  ]}
                >
                  {isActive && (
                    <Ionicons name="checkmark" size={10} color={colors.white} />
                  )}
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isActive && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCurrent && styles.stepLabelCurrent,
                ]}
              >
                {STATUS_LABELS[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    ...textStyles.h1,
    color: colors.ink,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  // ETA
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors['agave-light'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  etaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors['agave-deep'],
  },
  // Driver card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.snow,
    borderRadius: radius.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.agave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  driverLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors['ink-muted'],
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status header
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: colors.ink,
  },
  statusSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-muted'],
    marginTop: 1,
  },
  // Steps
  steps: {
    marginHorizontal: spacing['2xl'],
    gap: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    alignItems: 'center',
    width: 28,
    marginRight: spacing.md,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cloud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.agave,
  },
  stepDotCurrent: {
    backgroundColor: colors.agave,
    borderWidth: 3,
    borderColor: colors['agave-soft'],
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.cloud,
  },
  stepLineActive: {
    backgroundColor: colors.agave,
  },
  stepLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-hint'],
    paddingTop: 2,
  },
  stepLabelActive: {
    color: colors['ink-secondary'],
  },
  stepLabelCurrent: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.ink,
  },
  // Empty
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...textStyles.body,
    color: colors['ink-muted'],
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: colors['ink-hint'],
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  loader: {
    marginTop: spacing['4xl'],
  },
});
