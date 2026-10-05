import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTracking } from '../../hooks/useTracking';
import { OrderTrackingMap } from '../../components/OrderTrackingMap';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

import { ORDER_STATUS_LABELS as STATUS_LABELS } from '../../utils/orderStatus';

export const TrackingScreen: React.FC = () => {
  const { profile } = useAuth();
  const phone = profile?.phone ?? '';
  const { activeOrders, loading: ordersLoading, error, refresh } = useOrders(phone);
  const insets = useSafeAreaInsets();

  const activeOrder = activeOrders[0] ?? null;

  const { order: trackedOrder, driverLat, driverLng, driverUpdatedAt } = useTracking(activeOrder?.id ?? null);
  const currentOrder = trackedOrder ?? activeOrder;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  React.useEffect(() => { setEta(null); }, [currentOrder?.id, currentOrder?.status]);

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

  const isPickup = currentOrder.delivery_type === 'pickup';
  const showMap = !isPickup && ['ACCEPTED', 'PICKING', 'ADJUSTED', 'ON_THE_WAY'].includes(currentOrder.status);

  const handleCallDriver = () => {
    if (currentOrder.delivery_driver_phone) {
      void Linking.openURL(`tel:${currentOrder.delivery_driver_phone}`).catch(() => Alert.alert('No se pudo abrir el teléfono', 'Intenta llamar desde la aplicación de teléfono.'));
    }
  };

  const statusText = STATUS_LABELS[currentOrder.status] ?? currentOrder.status;

  return (
    <View style={styles.container}>
      {/* ─── LIVE MAP FULL SCREEN ─── */}
      {showMap ? (
        <View style={StyleSheet.absoluteFillObject}>
          <OrderTrackingMap
            key={currentOrder.id}
            restaurantLat={(currentOrder as any).restaurants?.lat ?? null}
            restaurantLng={(currentOrder as any).restaurants?.lng ?? null}
            restaurantName={(currentOrder as any).restaurants?.name}
            clientLat={currentOrder.client_lat || 0}
            clientLng={currentOrder.client_lng || 0}
            driverLat={driverLat ?? currentOrder.driver_last_lat ?? null}
            driverLng={driverLng ?? currentOrder.driver_last_lng ?? null}
            driverName={currentOrder.delivery_driver_name}
            driverUpdatedAt={driverUpdatedAt ?? currentOrder.driver_location_updated_at}
            status={currentOrder.status}
            onRouteInfo={setEta}
          />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f6f5f0' }]} />
      )}

      {/* ─── TOP FLOATING HEADER ─── */}
      <View style={[styles.topHeader, { top: insets.top + spacing.md }]}>
        <BlurView intensity={80} tint="light" style={styles.headerPill}>
          <Text style={styles.headerTitle}>Sigue tu pedido</Text>
          <Text style={styles.headerSubtitle}>#{currentOrder.order_number}</Text>
        </BlurView>
      </View>

      {/* ─── BOTTOM GLASSMORPHISM CARD ─── */}
      <View style={[styles.bottomCardWrapper, { paddingBottom: insets.bottom + spacing.md }]}>
        <BlurView intensity={95} tint="light" style={styles.glassCard}>
          {/* Drag Handle */}
          <TouchableOpacity
            style={styles.dragHandleContainer}
            onPress={() => setIsCollapsed(!isCollapsed)}
            activeOpacity={0.8}
          >
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons
                name={isCollapsed ? 'chevron-up-circle' : 'chevron-down-circle'}
                size={16}
                color={colors.agave}
              />
              <Text style={{ fontFamily: fonts.outfit.bold, fontSize: 12, color: colors.agave }}>
                {isCollapsed ? 'Ver detalle del pedido 📋' : 'Minimizar para ver mapa completo 🗺️'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Status and ETA Row */}
          <View style={styles.statusRow}>
            <Text style={styles.statusTextPrimary}>{statusText}</Text>
            {eta && currentOrder.status === 'ON_THE_WAY' && (
              <View style={styles.etaContainer}>
                <Text style={styles.etaLabel}>Llegada estimada</Text>
                <Text style={styles.etaValue}>{eta}</Text>
              </View>
            )}
          </View>

          {!isCollapsed && (
            <>

          {/* Driver Info Row */}
          {!!currentOrder.delivery_driver_id ? (
            <View style={styles.driverRow}>
              <View style={styles.avatarWrapper}>
                {/* Fallback to person icon if no photo is available */}
                <Ionicons name="person" size={24} color={colors.agave} />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{currentOrder.delivery_driver_name || 'Tu repartidor'}</Text>
                <Text style={styles.ratingText}>{currentOrder.status === 'ON_THE_WAY' ? 'Va hacia tu destino' : 'Asignado a tu pedido'}</Text>
              </View>
              {currentOrder.delivery_driver_phone && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.circleBtn} onPress={handleCallDriver}>
                    <Ionicons name="call-outline" size={20} color="#1d1d1f" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.driverRow}>
              <View style={[styles.avatarWrapper, { backgroundColor: '#f0e6d2' }]}>
                <Ionicons name="restaurant" size={20} color="#d4b48c" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{isPickup ? 'Recoges en el establecimiento' : currentOrder.status === 'PENDING' ? 'Esperando al establecimiento' : 'Buscando repartidor'}</Text>
                <Text style={styles.ratingText}>{isPickup ? 'Consulta el estado de preparación de tu pedido' : 'Aquí verás las actualizaciones de tu pedido'}</Text>
              </View>
            </View>
          )}

          {/* Restaurant Row & Progress */}
          <View style={styles.restaurantSection}>
            <View style={styles.restaurantHeaderRow}>
              <View style={styles.restaurantLogo}>
                <Ionicons name="fast-food" size={16} color={colors.agave} />
              </View>
              <View style={styles.restaurantTextContainer}>
                <Text style={styles.restaurantLabel}>Tu pedido de</Text>
                <Text style={styles.restaurantName}>{(currentOrder as any).restaurants?.name ?? 'Establecimiento'}</Text>
              </View>

            </View>
          </View>

          <View style={styles.divider} />

          {/* Breadcrumbs */}
          <View style={styles.breadcrumbRow}>
            <Text style={styles.breadcrumbText}>
              {(currentOrder as any).restaurants?.name ?? 'Restaurante'}
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#9ca5b3" style={{ marginHorizontal: 4 }} />
            <Text style={styles.breadcrumbText}>{isPickup ? 'Recogida' : 'Repartidor'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#9ca5b3" style={{ marginHorizontal: 4 }} />
            <Text style={styles.breadcrumbTextBold}>{isPickup ? 'En el establecimiento' : 'Tu destino'}</Text>
          </View>
          </>
          )}

        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f5f0',
  },
  topHeader: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  headerPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  headerTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: '#1d1d1f',
  },
  headerSubtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: '#9ca5b3',
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  glassCard: {
    backgroundColor: 'rgba(248, 245, 240, 0.85)',
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d1d1',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTextPrimary: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
    color: colors.agave, // Deep purple
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  etaLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: '#1d1d1f',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  etaValue: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: '#1d1d1f',
    marginTop: -2,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors['agave-light'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: '#1d1d1f',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#5a5a5a',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eae6df',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantSection: {
    marginBottom: spacing.md,
  },
  restaurantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#eae6df',
  },
  restaurantTextContainer: {
    flex: 1,
  },
  restaurantLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#5a5a5a',
  },
  restaurantName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#1d1d1f',
  },
  progressContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: '#1d1d1f',
    marginBottom: 4,
  },
  progressBarBg: {
    width: 50,
    height: 4,
    backgroundColor: '#eae6df',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.agave,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: spacing.md,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#5a5a5a',
  },
  breadcrumbTextBold: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: '#1d1d1f',
  },
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
