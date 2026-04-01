import { supabase } from './supabase';
import type { Order } from '../types/database';

/**
 * Obtiene los pedidos asignados al repartidor (ACCEPTED + ON_THE_WAY).
 */
export const getAssignedOrders = async (
  driverId: string,
): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('delivery_driver_id', driverId)
    .in('status', ['ACCEPTED', 'ON_THE_WAY'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
};

/**
 * Obtiene el historial de entregas completadas.
 */
export const getDeliveryHistory = async (
  driverId: string,
  limit = 50,
): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('delivery_driver_id', driverId)
    .eq('status', 'DELIVERED')
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
};

/**
 * Obtiene un pedido por ID.
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) throw new Error(error.message);
  return data as Order;
};

/**
 * Suscripción en tiempo real a cambios en pedidos del repartidor.
 */
export const subscribeToDriverOrders = (
  driverId: string,
  callback: (order: Order) => void,
) => {
  const channel = supabase
    .channel(`driver-orders-${driverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `delivery_driver_id=eq.${driverId}`,
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
