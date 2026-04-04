import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVER_TOKEN_KEY = '@pideya_driver_token';

const getToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem(DRIVER_TOKEN_KEY);
  if (!token) throw new Error('No hay sesión activa');
  return token;
};

/**
 * Toggle disponibilidad del repartidor.
 */
export const toggleAvailable = async (
  available: boolean,
): Promise<void> => {
  const token = await getToken();

  const { data, error } = await supabase.rpc('driver_toggle_available', {
    p_access_token: token,
    p_available: available,
  });

  if (error) throw new Error(error.message);
};

/**
 * Obtener el estado actual de disponibilidad del driver.
 */
export const getDriverAvailability = async (
  driverId: string,
): Promise<{ is_available: boolean; current_order_id: string | null }> => {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('is_available, current_order_id')
    .eq('id', driverId)
    .single();

  if (error) throw new Error(error.message);
  return {
    is_available: data?.is_available ?? false,
    current_order_id: data?.current_order_id ?? null,
  };
};

/**
 * Suscripción en tiempo real al perfil del driver (para toggle + current_order).
 */
export const subscribeToDriverProfile = (
  driverId: string,
  callback: (profile: { is_available: boolean; current_order_id: string | null }) => void,
) => {
  const channel = supabase
    .channel(`driver-profile-${driverId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_profiles',
        filter: `id=eq.${driverId}`,
      },
      (payload) => {
        const p = payload.new as any;
        callback({
          is_available: p.is_available,
          current_order_id: p.current_order_id,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
