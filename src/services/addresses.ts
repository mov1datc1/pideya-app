import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { UserAddress } from '../types/database';
import { toCoordinate } from '../utils/coordinates';

const PREFIX = '@pideya/addresses';
async function account() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Inicia sesión para guardar tus direcciones');
  return { userId, cacheKey: `${PREFIX}/${userId}`, migrationKey: `${PREFIX}/cloud-v1/${userId}` };
}
function owned(raw: string | null, userId: string): UserAddress[] {
  try { const rows = JSON.parse(raw || '[]'); return Array.isArray(rows) ? rows.filter(a => a?.user_id === userId && a.address_text?.trim() && toCoordinate(a.latitude, a.longitude)) : []; }
  catch { return []; }
}
async function fetchCloud(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase.from('client_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export const getAddresses = async (): Promise<UserAddress[]> => {
  const { userId, cacheKey, migrationKey } = await account();
  const migrated = await AsyncStorage.getItem(migrationKey);
  try {
    let addresses = await fetchCloud(userId);
    if (migrated !== 'true') {
      const local = [...owned(await AsyncStorage.getItem(cacheKey), userId), ...owned(await AsyncStorage.getItem(PREFIX), userId)];
      const seen = new Set(addresses.map(a => a.id));
      let imported = false;
      for (const address of local) {
        if (seen.has(address.id)) continue;
        const { error } = await supabase.rpc('save_client_address', { p_address: { ...address, is_default: addresses.length === 0 && !imported && address.is_default } });
        if (error) throw error;
        seen.add(address.id); imported = true;
      }
      if (imported) addresses = await fetchCloud(userId);
      await AsyncStorage.setItem(migrationKey, 'true');
    }
    await AsyncStorage.setItem(cacheKey, JSON.stringify(addresses)).catch(() => {});
    return addresses;
  } catch (error) {
    // Offline access is only to addresses already synchronized with this authenticated account.
    const cached = migrated === 'true' ? owned(await AsyncStorage.getItem(cacheKey), userId) : [];
    if (cached.length) return cached;
    throw error;
  }
};
export const addAddress = async (input: Omit<UserAddress, 'id' | 'created_at'>): Promise<UserAddress> => {
  if (!toCoordinate(input.latitude, input.longitude) || !input.address_text.trim() || !input.label.trim()) throw new Error('Confirma el punto y la dirección antes de guardar');
  const { userId, cacheKey } = await account();
  if (input.user_id !== userId) throw new Error('La cuenta cambió. Vuelve a configurar tu dirección.');
  const { data, error } = await supabase.rpc('save_client_address', { p_address: input });
  if (error) throw error;
  const address = data as UserAddress;
  if (!address?.id || address.user_id !== userId) throw new Error('No se pudo confirmar el guardado');
  const addresses = await fetchCloud(userId).catch(() => [address]);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(addresses)).catch(() => {});
  // Do not mark migration complete here: other local addresses may still need to be imported.
  return address;
};
export const updateAddress = async (id: string, patch: Partial<Omit<UserAddress, 'id' | 'created_at'>>): Promise<UserAddress | null> => {
  const { userId, cacheKey } = await account();
  const addresses = await fetchCloud(userId);
  const old = addresses.find(a => a.id === id);
  if (!old) return null;
  const { data, error } = await supabase.rpc('save_client_address', { p_address: { ...old, ...patch, id, user_id: userId } });
  if (error) throw error;
  await AsyncStorage.removeItem(cacheKey).catch(() => {});
  return data as UserAddress;
};
export const deleteAddress = async (id: string): Promise<void> => {
  const { userId, cacheKey } = await account();
  const { error } = await supabase.from('client_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
  await AsyncStorage.removeItem(cacheKey).catch(() => {});
};
export const setDefaultAddress = async (id: string): Promise<void> => {
  const { cacheKey } = await account();
  const { error } = await supabase.rpc('set_default_client_address', { p_id: id });
  if (error) throw error;
  await AsyncStorage.removeItem(cacheKey).catch(() => {});
};
export const getDefaultAddress = async (): Promise<UserAddress | null> => {
  const addresses = await getAddresses();
  return addresses.find(a => a.is_default) ?? addresses[0] ?? null;
};
