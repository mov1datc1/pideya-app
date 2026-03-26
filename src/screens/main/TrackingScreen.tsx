import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTracking } from '../../hooks/useTracking';
import { colors, textStyles, spacing, fonts } from '../../theme';

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Esperando confirmacion',
  ACCEPTED: 'Preparando tu pedido',
  ON_THE_WAY: 'En camino',
  DELIVERED: 'Entregado',
};

export const TrackingScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { activeOrders, loading: ordersLoading } = useOrders(phone);

  const activeOrder = activeOrders[0] ?? null;
  const { order: trackedOrder, hasDriver, driverLat, driverLng } = useTracking(
    activeOrder?.id ?? null,
  );

  const currentOrder = trackedOrder ?? activeOrder;

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
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
          <Text style={styles.emptyText}>No tienes pedidos activos</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentStepIdx = STATUS_STEPS.indexOf(
    currentOrder.status as (typeof STATUS_STEPS)[number],
  );

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Rastreo</Text>

      <Card style={styles.card}>
        <Text style={styles.orderNumber}>
          Pedido #{currentOrder.order_number}
        </Text>

        {/* Progress steps */}
        <View style={styles.steps}>
          {STATUS_STEPS.map((step, i) => {
            const isActive = i <= currentStepIdx;
            const isCurrent = i === currentStepIdx;
            return (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    isActive && styles.stepDotActive,
                    isCurrent && styles.stepDotCurrent,
                  ]}
                />
                {i < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isActive && styles.stepLineActive,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                  ]}
                >
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Driver info */}
        {hasDriver && currentOrder.delivery_driver_name && (
          <View style={styles.driverInfo}>
            <Text style={styles.driverLabel}>Tu repartidor:</Text>
            <Text style={styles.driverName}>
              {currentOrder.delivery_driver_name}
            </Text>
            {currentOrder.delivery_driver_phone && (
              <Text style={styles.driverPhone}>
                {currentOrder.delivery_driver_phone}
              </Text>
            )}
          </View>
        )}

        {/* Map placeholder */}
        {hasDriver && driverLat && driverLng && (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>
              Ubicacion del repartidor: {driverLat.toFixed(4)}, {driverLng.toFixed(4)}
            </Text>
            <Text style={styles.mapHint}>
              (Integrar Google Maps aqui)
            </Text>
          </View>
        )}
      </Card>
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
  card: {
    gap: spacing.lg,
  },
  orderNumber: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 17,
    color: colors.ink,
  },
  steps: {
    gap: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 32,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.silver,
  },
  stepDotActive: {
    backgroundColor: colors.agave,
  },
  stepDotCurrent: {
    borderWidth: 3,
    borderColor: colors['agave-light'],
  },
  stepLine: {
    position: 'absolute',
    left: 5,
    top: 24,
    width: 2,
    height: 20,
    backgroundColor: colors.silver,
  },
  stepLineActive: {
    backgroundColor: colors.agave,
  },
  stepLabel: {
    ...textStyles.body,
    color: colors['ink-hint'],
  },
  stepLabelActive: {
    color: colors.ink,
    fontFamily: fonts.outfit.medium,
  },
  driverInfo: {
    backgroundColor: colors['agave-light'],
    padding: spacing.md,
    borderRadius: 10,
    gap: 2,
  },
  driverLabel: {
    ...textStyles.caption,
    color: colors['agave-dark'],
  },
  driverName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors['agave-deep'],
  },
  driverPhone: {
    ...textStyles.caption,
    color: colors['agave-dark'],
  },
  mapPlaceholder: {
    backgroundColor: colors.cloud,
    height: 160,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    ...textStyles.caption,
    color: colors['ink-secondary'],
  },
  mapHint: {
    ...textStyles.caption,
    color: colors['ink-hint'],
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...textStyles.body,
    color: colors['ink-muted'],
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing['4xl'],
  },
});
