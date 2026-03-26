import { supabase } from './supabase';
import type { DriverLocation, Order } from '../types/database';

/**
 * Suscripcion en tiempo real a la ubicacion del repartidor.
 * driver_locations esta en supabase_realtime publication (migration 015).
 */
export const subscribeToDriverLocation = (
  driverId: string,
  callback: (location: DriverLocation) => void,
) => {
  const channel = supabase
    .channel(`driver-location-${driverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_locations',
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        callback(payload.new as DriverLocation);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Obtener la ultima ubicacion conocida del repartidor
 * directamente de los campos del pedido.
 */
export const getDriverLocationFromOrder = async (
  orderId: string,
): Promise<{
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  updated_at: string | null;
} | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'driver_last_lat, driver_last_lng, driver_location_accuracy_m, driver_location_updated_at',
    )
    .eq('id', orderId)
    .single();
  if (error) throw error;
  if (!data) return null;
  return {
    lat: data.driver_last_lat,
    lng: data.driver_last_lng,
    accuracy_m: data.driver_location_accuracy_m,
    updated_at: data.driver_location_updated_at,
  };
};

/**
 * Suscripcion combinada: escucha cambios del pedido (incluye lat/lng del driver
 * que se sincronizan en los campos driver_last_lat/lng del order).
 */
export const subscribeToOrderTracking = (
  orderId: string,
  callback: (order: Order) => void,
) => {
  const channel = supabase
    .channel(`order-tracking-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        callback(payload.new as Order);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
