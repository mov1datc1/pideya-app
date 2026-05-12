import { supabase } from './supabase';
import type { Order, OrderItemJSON, OrderStatus, DeliveryType } from '../types/database';

interface CreateOrderInput {
  restaurant_id: string;
  client_name: string;
  client_phone: string;
  client_lat: number;
  client_lng: number;
  client_location_note?: string;
  items: OrderItemJSON[];
  subtotal: number;
  commission_amount: number;
  delivery_amount: number;
  delivery_type: DeliveryType;
  total: number;
  payment_method?: string;
}

export const createOrder = async (input: CreateOrderInput) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...input,
      status: 'PENDING' as OrderStatus,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Order;
};

export const getOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurants(name, lat, lng, logo_url)')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[PideYa] getOrderById error:', JSON.stringify(error));
    throw error;
  }
  return data as Order & { restaurants?: { name: string; lat: number; lng: number; logo_url: string | null } };
};

/**
 * Historial de pedidos del cliente (por telefono).
 * La app web no usa user_id en orders — usa client_phone.
 */
export const getOrderHistory = async (clientPhone: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurants(name, logo_url)')
    .eq('client_phone', clientPhone)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[PideYa] getOrderHistory error:', JSON.stringify(error));
    throw error;
  }
  return data as (Order & { restaurants: { name: string; logo_url: string | null } })[];
};

/** Pedidos activos (no finalizados) del cliente */
export const getActiveOrders = async (clientPhone: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurants(name, logo_url)')
    .eq('client_phone', clientPhone)
    .in('status', ['PENDING', 'ACCEPTED', 'ON_THE_WAY'])
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[PideYa] getActiveOrders error:', JSON.stringify(error));
    throw error;
  }
  return data as (Order & { restaurants: { name: string; logo_url: string | null } })[];
};

/** Cancelar pedido.
 * PENDING: any payment method can cancel.
 * ACCEPTED/ON_THE_WAY: only card payments can cancel (30% fee applied server-side).
 */
export const cancelOrder = async (orderId: string) => {
  // First get current order to check status/payment
  const { data: current } = await supabase
    .from('orders')
    .select('status, payment_method')
    .eq('id', orderId)
    .single();

  if (!current) throw new Error('Pedido no encontrado');

  const canCancel =
    current.status === 'PENDING' ||
    (current.payment_method === 'card' &&
      ['ACCEPTED', 'ON_THE_WAY'].includes(current.status));

  if (!canCancel) {
    throw new Error('Este pedido no puede cancelarse en este estado.');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'CANCELLED' as OrderStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'client',
    })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data as Order;
};

/**
 * Suscripcion en tiempo real al estado de un pedido.
 * Usa Supabase Realtime (orders esta en supabase_realtime publication).
 */
export const subscribeToOrderStatus = (
  orderId: string,
  callback: (order: Order) => void,
) => {
  const channel = supabase
    .channel(`order-${orderId}`)
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
