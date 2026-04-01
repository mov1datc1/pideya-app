import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { DriverProfile, Restaurant } from '../types/database';

const DRIVER_TOKEN_KEY = '@pideya_driver_token';
const DRIVER_PROFILE_KEY = '@pideya_driver_profile';

// ── Token-based auth (existing system) ──────────────────────

export interface DriverSessionResult {
  driver: DriverProfile;
  restaurant: Restaurant;
}

/**
 * Valida un access_token llamando al RPC driver_get_session.
 * Retorna el perfil del repartidor y su restaurante.
 */
export const loginWithToken = async (
  token: string,
): Promise<DriverSessionResult> => {
  const { data, error } = await supabase.rpc('driver_get_session', {
    p_token: token,
  });

  if (error) throw new Error(error.message);
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('Token inválido o repartidor inactivo');
  }

  const row = Array.isArray(data) ? data[0] : data;

  const driver: DriverProfile = {
    id: row.driver_id,
    restaurant_id: row.restaurant_id,
    user_id: row.user_id ?? null,
    name: row.driver_name,
    phone: row.driver_phone,
    vehicle_label: row.vehicle_label ?? null,
    notes: null,
    is_active: true,
    push_token: row.push_token ?? null,
    last_location_at: null,
    created_at: '',
    updated_at: '',
  };

  const restaurant: Restaurant = {
    id: row.restaurant_id,
    name: row.restaurant_name,
    phone: row.restaurant_phone ?? '',
    address: row.restaurant_address ?? null,
    lat: row.restaurant_lat ?? null,
    lng: row.restaurant_lng ?? null,
    logo_url: row.restaurant_logo ?? null,
  };

  // Persist token and profile locally
  await AsyncStorage.setItem(DRIVER_TOKEN_KEY, token);
  await AsyncStorage.setItem(
    DRIVER_PROFILE_KEY,
    JSON.stringify({ driver, restaurant }),
  );

  return { driver, restaurant };
};

// ── Phone OTP auth (new - links driver to auth.users) ───────

/**
 * Envía OTP por SMS al teléfono del repartidor.
 */
export const sendPhoneOtp = async (phone: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw new Error(error.message);
};

/**
 * Verifica el OTP y vincula el user_id al driver_profile.
 */
export const verifyPhoneOtp = async (
  phone: string,
  otp: string,
  driverId: string,
): Promise<void> => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms',
  });
  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (!userId) throw new Error('No se pudo obtener el usuario');

  // Link user_id to driver_profile
  const { error: updateError } = await supabase
    .from('driver_profiles')
    .update({ user_id: userId })
    .eq('id', driverId);

  if (updateError) {
    console.warn('No se pudo vincular user_id:', updateError.message);
  }
};

// ── Session management ──────────────────────────────────────

/**
 * Recupera la sesión guardada localmente.
 */
export const getSavedSession =
  async (): Promise<DriverSessionResult | null> => {
    try {
      const profileJson = await AsyncStorage.getItem(DRIVER_PROFILE_KEY);
      if (!profileJson) return null;
      return JSON.parse(profileJson) as DriverSessionResult;
    } catch {
      return null;
    }
  };

/**
 * Recupera el token guardado y revalida con el backend.
 */
export const restoreSession =
  async (): Promise<DriverSessionResult | null> => {
    try {
      const token = await AsyncStorage.getItem(DRIVER_TOKEN_KEY);
      if (!token) return null;
      return await loginWithToken(token);
    } catch {
      await clearSession();
      return null;
    }
  };

/**
 * Limpia toda la sesión local.
 */
export const clearSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(DRIVER_TOKEN_KEY);
  await AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
  await supabase.auth.signOut().catch(() => {});
};

/**
 * Guarda el push token en el perfil del repartidor.
 */
export const savePushToken = async (
  driverId: string,
  pushToken: string,
): Promise<void> => {
  const { error } = await supabase
    .from('driver_profiles')
    .update({ push_token: pushToken })
    .eq('id', driverId);

  if (error) console.warn('Error guardando push token:', error.message);
};
