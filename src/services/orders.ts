import { reportCheckoutFailure } from './technicalIncidents';
import { realtimeChannelName } from '../utils/realtimeChannel';
import { supabase } from './supabase';
import { ACTIVE_ORDER_STATUSES } from '../utils/orderStatus';
import type { Order, OrderItemJSON, OrderStatus, DeliveryType, PickingPreferences } from '../types/database';

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
  picking_preferences?: PickingPreferences;
}

export const createOrder = async (input: CreateOrderInput) => {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session?.user.id) throw new Error('Inicia sesión para confirmar tu pedido');
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...input,
      client_user_id: auth.session.user.id,
      status: 'PENDING' as OrderStatus,
    })
    .select()
    .single();
  if (error) { void reportCheckoutFailure(error, input.restaurant_id); throw error; }
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
async function accountOrderFilter(clientPhone: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.id) throw new Error('Inicia sesión para ver tus pedidos');
  const phone = JSON.stringify(clientPhone);
  return `client_user_id.eq.${data.session.user.id},and(client_user_id.is.null,client_phone.eq.${phone})`;
}

export const getOrderHistory = async (clientPhone: string, offset = 0) => {
  const filter = await accountOrderFilter(clientPhone);
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurants(name, logo_url, lat, lng)')
    .or(filter)
    .order('created_at', { ascending: false })
    .range(offset, offset + 49);
  if (error) {
    console.error('[PideYa] getOrderHistory error:', JSON.stringify(error));
    throw error;
  }
  return data as (Order & { restaurants: { name: string; logo_url: string | null } })[];
};

/** Pedidos activos (no finalizados) del cliente */
export const getActiveOrders = async (clientPhone: string) => {
  const filter = await accountOrderFilter(clientPhone);
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurants(name, logo_url, lat, lng)')
    .or(filter)
    .in('status', ACTIVE_ORDER_STATUSES)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[PideYa] getActiveOrders error:', JSON.stringify(error));
    throw error;
  }
  return data as (Order & { restaurants: { name: string; logo_url: string | null } })[];
};

/** Cancellation is decided atomically by the server, before merchant acceptance. */
export const cancelOrder = async (orderId: string, _currentStatus: OrderStatus, _paymentMethod: string) => {
  const { data, error } = await supabase.rpc('client_cancel_order', { p_order_id: orderId });
  if (error) throw new Error(error.message);
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
    .channel(realtimeChannelName('order', orderId))
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
