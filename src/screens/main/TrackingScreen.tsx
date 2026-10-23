import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTracking } from '../../hooks/useTracking';
import { DeliveryTrackingView } from '../../components/DeliveryTrackingView';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';



export const TrackingScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { activeOrders, loading: ordersLoading, error, refresh } = useOrders(phone);

  const activeOrder = activeOrders[0] ?? null;

  const { order: trackedOrder, driverLat, driverLng, driverUpdatedAt } = useTracking(activeOrder?.id ?? null);
  const currentOrder = trackedOrder ?? activeOrder;

  if (!phone) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyText}>Inicia sesión para rastrear pedidos</Text>
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

  if (error && !currentOrder) return <ScreenWrapper><View style={styles.center}>
    <Text style={styles.emptyText}>{error}</Text>
    <TouchableOpacity onPress={refresh}><Text style={{ color: colors.agave }}>Reintentar</Text></TouchableOpacity>
  </View></ScreenWrapper>;

  if (!currentOrder) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={colors['ink-hint']} />
          <Text style={styles.emptyText}>No tienes pedidos activos</Text>
          <Text style={styles.emptySubtext}>Cuando hagas un pedido, verás el rastreo aquí</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return <DeliveryTrackingView order={currentOrder} driverLat={driverLat} driverLng={driverLng} driverUpdatedAt={driverUpdatedAt} />;
};
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { ...textStyles.body, color: colors['ink-muted'], textAlign: 'center' },
  emptySubtext: { fontFamily: fonts.outfit.regular, fontSize: 13, color: colors['ink-hint'], textAlign: 'center', paddingHorizontal: spacing['2xl'] },
  loader: { marginTop: spacing['4xl'] },
});
