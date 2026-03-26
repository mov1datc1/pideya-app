import { supabase } from './supabase';
import type { Order, OrderItemJSON, OrderStatus } from '../types/database';

interface CreateOrderInput {
  restaurant_id: string;
  client_name: string;
  client_phone: string;
  client_lat: number;
  client_lng: number;
  client_location_note?: string;
  items: OrderItemJSON[];
  subtotal: number;
  delivery_amount: number;
  total: number;
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
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Order;
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
  if (error) throw error;
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
  if (error) throw error;
  return data as (Order & { restaurants: { name: string; logo_url: string | null } })[];
};

/** Cancelar pedido (solo si aun esta PENDING) */
export const cancelOrder = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'CANCELLED' as OrderStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'client',
    })
    .eq('id', orderId)
    .eq('status', 'PENDING')
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
