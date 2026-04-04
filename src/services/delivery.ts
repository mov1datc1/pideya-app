import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVER_TOKEN_KEY = '@pideya_driver_token';

const getToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem(DRIVER_TOKEN_KEY);
  if (!token) throw new Error('No hay sesión activa');
  return token;
};

/**
 * Tomar un pedido: cambia status a ON_THE_WAY.
 * Valida regla de 1 pedido activo via RPC.
 */
export const takeOrder = async (orderId: string): Promise<void> => {
  const token = await getToken();

  const { data, error } = await supabase.rpc('driver_take_order', {
    p_access_token: token,
    p_order_id: orderId,
  });

  if (error) throw new Error(error.message);
};

/**
 * Marcar pedido como entregado via RPC.
 * Limpia current_order_id y retorna pedidos pendientes.
 */
export const completeDelivery = async (
  orderId: string,
): Promise<{ pending_orders: number }> => {
  const token = await getToken();

  const { data, error } = await supabase.rpc('driver_complete_delivery', {
    p_access_token: token,
    p_order_id: orderId,
  });

  if (error) {
    // Fallback: actualizar directo si el RPC no existe aún
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'DELIVERED', delivered_at: new Date().toISOString() })
      .eq('id', orderId);
    if (updateError) throw new Error(updateError.message);
    return { pending_orders: 0 };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return { pending_orders: result?.pending_orders ?? 0 };
};

/**
 * Actualizar ubicación del repartidor.
 */
export const updateDriverLocation = async (params: {
  orderId: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
}): Promise<void> => {
  const token = await getToken();

  const { error } = await supabase.rpc('driver_update_location', {
    p_access_token: token,
    p_order_id: params.orderId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_accuracy_m: params.accuracy_m,
    p_heading: params.heading,
    p_speed_mps: params.speed_mps,
  });

  if (error) {
    console.warn('Error actualizando ubicación:', error.message);
  }
};
