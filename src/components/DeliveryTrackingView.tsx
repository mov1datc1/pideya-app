import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderTrackingMap } from './OrderTrackingMap';
import { colors, fonts } from '../theme';
import { locationFreshness } from '../utils/trackingPresentation';
import { ORDER_STATUS_LABELS } from '../utils/orderStatus';
import type { Order } from '../types/database';

interface Props {
  order: Order;
  driverLat?: number | null;
  driverLng?: number | null;
  driverUpdatedAt?: string | null;
  onClose?: () => void;
  children?: React.ReactNode;
}

/** Shared native presentation for the tracking tab and an individual order. */
export function DeliveryTrackingView({ order, driverLat, driverLng, driverUpdatedAt, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(320);
  const [headerHeight, setHeaderHeight] = useState(72);
  const [eta, setEta] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  useEffect(() => { setEta(null); setCollapsed(false); }, [order.id, order.status]);
  const updatedAt = driverUpdatedAt ?? order.driver_location_updated_at;
  const freshness = locationFreshness(updatedAt, now);
  const pickup = order.delivery_type === 'pickup';
  const onWay = order.status === 'ON_THE_WAY';
  const hasMap = !pickup && ['ACCEPTED', 'PICKING', 'ADJUSTED', 'ON_THE_WAY'].includes(order.status);
  const restaurant = (order as Order & { restaurants?: { lat?: number; lng?: number; name?: string } }).restaurants;
  const step = order.status === 'DELIVERED' ? 3 : onWay ? 2 : order.status === 'PENDING' ? 0 : 1;
  const steps = ['Confirmado', order.status === 'PICKING' ? 'Surtiendo' : 'Preparando', pickup ? 'Recogida' : 'En camino', 'Entregado'];
  const call = () => {
    if (order.delivery_driver_phone) void Linking.openURL(`tel:${order.delivery_driver_phone}`).catch(() => Alert.alert('No se pudo abrir el teléfono', 'Intenta llamar desde la aplicación de teléfono.'));
  };
  const subtitle = onWay ? freshness.label : pickup ? 'Recogida en el negocio' : ORDER_STATUS_LABELS[order.status];
  return <View style={s.screen}>
    {hasMap && <OrderTrackingMap key={order.id}
      restaurantLat={restaurant?.lat ?? null} restaurantLng={restaurant?.lng ?? null} restaurantName={restaurant?.name}
      clientLat={order.client_lat || 0} clientLng={order.client_lng || 0}
      driverLat={driverLat ?? order.driver_last_lat ?? null} driverLng={driverLng ?? order.driver_last_lng ?? null}
      driverName={order.delivery_driver_name} driverUpdatedAt={updatedAt} status={order.status}
      onRouteInfo={setEta} topInset={insets.top + headerHeight + 24} bottomInset={sheetHeight + 16} showFreshness={false} />}
    <View style={[s.header, { top: insets.top + 10 }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
      {onClose ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar seguimiento" onPress={onClose} style={s.close}><Ionicons name="arrow-back" size={22} color={colors.ink} /></TouchableOpacity> : <View accessible accessibilityLabel="PideYa" style={s.logoCrop}><Image source={require('../../assets/icon.png')} style={s.logo} /></View>}
      <View style={s.headerText}><Text style={s.headerTitle}>Sigue tu pedido · #{order.order_number}</Text><Text style={s.secondary}>{subtitle}</Text></View>
    </View>
    <View style={[s.sheet, { maxHeight: height * (collapsed ? 0.35 : 0.52), paddingBottom: Math.max(insets.bottom, 12) }]} onLayout={e => setSheetHeight(e.nativeEvent.layout.height)}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={collapsed ? 'Mostrar detalles del pedido' : 'Minimizar detalles para ver el mapa'} accessibilityState={{ expanded: !collapsed }} onPress={() => setCollapsed(!collapsed)} style={s.handleButton}>
        <View style={s.handle} /><Ionicons name={collapsed ? 'chevron-up' : 'chevron-down'} size={16} color={colors['ink-secondary']} style={s.handleIcon} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Text style={s.title}>{onWay ? 'Tu pedido va en camino' : ORDER_STATUS_LABELS[order.status]}</Text>
        {onWay && <View style={s.etaRow}>
          <Text style={[s.eta, { fontSize: width < 360 ? 32 : 40 }]}>{!freshness.stale && eta ? eta : 'En camino'}</Text>
          <Text style={s.etaLabel}>{!freshness.stale && eta ? 'Llegada\nestimada' : 'Esperando\nactualización'}</Text>
        </View>}
        {!collapsed && <>
          <View style={s.progress} accessibilityLabel={`Estado del pedido: ${ORDER_STATUS_LABELS[order.status]}`}>
            {steps.map((label, index) => <View key={label} style={s.step}>
              {index < 3 && <View style={[s.line, index < step && s.lineDone]} />}
              <View style={[s.dot, index <= step && s.dotActive, index < step && s.dotDone]}>{index < step ? <Ionicons name="checkmark" size={14} color={colors.white} /> : index === step ? <View style={s.dotCenter} /> : null}</View>
              <Text style={[s.stepLabel, index === step && s.stepCurrent]}>{index === 0 && order.status === 'PENDING' ? 'Enviado' : label}</Text>
            </View>)}
          </View>
          <View style={s.driverRow}>
            <View style={s.avatar}><Ionicons name={order.delivery_driver_id ? 'person-outline' : 'storefront-outline'} size={27} color={colors.agave} /></View>
            <View style={s.driverText}><Text style={s.driverName}>{order.delivery_driver_name || (pickup ? 'Recoge tu pedido' : 'Tu negocio prepara el pedido')}</Text><Text style={s.secondary}>{order.delivery_driver_id ? 'Tu repartidor' : pickup ? 'En el establecimiento' : 'Aquí verás al repartidor asignado'}</Text></View>
            {!!order.delivery_driver_phone && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Llamar al repartidor" style={s.call} onPress={call}><Ionicons name="call" size={17} color={colors.agave} /><Text style={s.callText}>Llamar</Text></TouchableOpacity>}
          </View>
          <View style={s.destination}><Ionicons name="storefront-outline" size={22} color={colors.ink} /><Text style={s.business} numberOfLines={2}>{restaurant?.name || 'Tu negocio'}</Text><Ionicons name="arrow-forward" size={20} color={colors.ink} /><Ionicons name={pickup ? 'bag-handle-outline' : 'home-outline'} size={22} color={colors.ink} /><Text style={s.destinationText}>{pickup ? 'Recogida' : 'Tu destino'}</Text></View>
          {children}
        </>}
      </ScrollView>
    </View>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F0' },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 24, backgroundColor: colors.white, elevation: 3, shadowColor: '#183E35', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  logoCrop: { width: 80, height: 30, overflow: 'hidden', marginRight: 12 },
  logo: { position: 'absolute', width: 164, height: 164, left: -28, top: -91 },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerText: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#E4E8E5', paddingLeft: 12 },
  headerTitle: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.ink },
  secondary: { fontFamily: fonts.outfit.regular, fontSize: 12, color: '#56636A', marginTop: 3 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white, shadowColor: '#183E35', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  handleButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D6DAD7' },
  handleIcon: { position: 'absolute', right: 22, top: 10 },
  content: { paddingHorizontal: 22, paddingBottom: 6 },
  title: { fontFamily: fonts.outfit.bold, fontSize: 23, color: colors.ink },
  etaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 6, marginBottom: 6 },
  eta: { fontFamily: fonts.outfit.bold, color: colors.agave, flexShrink: 1 },
  etaLabel: { fontFamily: fonts.outfit.regular, fontSize: 13, color: '#56636A', paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: '#D6DAD7' },
  progress: { flexDirection: 'row', marginTop: 14, marginBottom: 18 },
  step: { flex: 1, alignItems: 'center' },
  line: { position: 'absolute', top: 11, left: '50%', width: '100%', height: 3, backgroundColor: '#DEE2DF' },
  lineDone: { backgroundColor: colors.agave },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ABB4B0', backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  dotActive: { borderColor: colors.agave }, dotDone: { backgroundColor: colors.agave },
  dotCenter: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.agave },
  stepLabel: { fontFamily: fonts.outfit.regular, fontSize: 11, textAlign: 'center', marginTop: 6, color: '#56636A' }, stepCurrent: { fontFamily: fonts.outfit.semiBold, color: colors.ink },
  driverRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#ECF0ED', paddingVertical: 15 },
  avatar: { width: 45, height: 45, borderRadius: 24, backgroundColor: '#F0F4F1', alignItems: 'center', justifyContent: 'center' },
  driverText: { flex: 1, minWidth: 100 }, driverName: { fontFamily: fonts.outfit.semiBold, fontSize: 16, color: colors.ink },
  call: { minHeight: 44, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.agave, flexDirection: 'row', alignItems: 'center', gap: 7 }, callText: { fontFamily: fonts.outfit.semiBold, fontSize: 13, color: colors.agave },
  destination: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#ECF0ED' },
  business: { flex: 1, fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.ink }, destinationText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.ink, flexShrink: 1 },
});
