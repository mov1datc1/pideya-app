/**
 * Servicio de direcciones — almacenamiento local con AsyncStorage.
 *
 * NOTA: La DB de rancho_eats NO tiene tabla de addresses.
 * Las direcciones se guardan localmente en el dispositivo.
 * Si en el futuro se agrega la tabla, migrar a Supabase.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserAddress } from '../types/database';

const STORAGE_KEY = '@pideya/addresses';

const generateId = () =>
  `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readAll = async (): Promise<UserAddress[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const writeAll = async (addresses: UserAddress[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
};

export const getAddresses = async (): Promise<UserAddress[]> => {
  return readAll();
};

export const addAddress = async (
  data: Omit<UserAddress, 'id' | 'created_at'>,
): Promise<UserAddress> => {
  const addresses = await readAll();
  const newAddr: UserAddress = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  // Si es default, quitar default de las demas
  if (newAddr.is_default) {
    addresses.forEach((a) => (a.is_default = false));
  }
  addresses.push(newAddr);
  await writeAll(addresses);
  return newAddr;
};

export const updateAddress = async (
  id: string,
  data: Partial<Omit<UserAddress, 'id' | 'created_at'>>,
): Promise<UserAddress | null> => {
  const addresses = await readAll();
  const idx = addresses.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  if (data.is_default) {
    addresses.forEach((a) => (a.is_default = false));
  }
  addresses[idx] = { ...addresses[idx], ...data };
  await writeAll(addresses);
  return addresses[idx];
};

export const deleteAddress = async (id: string): Promise<void> => {
  const addresses = await readAll();
  await writeAll(addresses.filter((a) => a.id !== id));
};

export const setDefaultAddress = async (id: string): Promise<void> => {
  const addresses = await readAll();
  addresses.forEach((a) => (a.is_default = a.id === id));
  await writeAll(addresses);
};

export const getDefaultAddress = async (): Promise<UserAddress | null> => {
  const addresses = await readAll();
  return addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
};
