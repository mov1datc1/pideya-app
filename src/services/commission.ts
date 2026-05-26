/**
 * Commission service — reads tiered commission config from app_settings.
 * Uses AsyncStorage cache so checkout isn't blocked by slow network.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { CommissionTier } from '../types/database';

const CACHE_KEY = '@pideya/commission_tiers';

/** Default tiers — matches rancho_eats admin defaults */
const DEFAULT_TIERS: CommissionTier[] = [
  { up_to: 100, fee: 8 },
  { up_to: 150, fee: 10 },
  { up_to: 200, fee: 12 },
  { up_to: 300, fee: 15 },
  { up_to: 500, fee: 18 },
  { up_to: null, fee: 20 },
];

/**
 * Fetch commission tiers from Supabase app_settings.
 * Falls back to cached value, then to DEFAULT_TIERS.
 */
export const fetchCommissionTiers = async (): Promise<CommissionTier[]> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('commission_tiers')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const tiers = data?.commission_tiers as CommissionTier[] | null;
    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
      // Cache for offline use
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tiers));
      return tiers;
    }
  } catch (e) {
    console.warn('[PideYa] fetchCommissionTiers error, using cache:', e);
  }

  // Try cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }

  return DEFAULT_TIERS;
};

/**
 * Calculate commission for a given subtotal using tiered config.
 * Same formula as rancho_eats: find matching tier, clamp, round to integer.
 */
export const calculateCommission = (
  subtotal: number,
  tiers: CommissionTier[],
): number => {
  if (!tiers || tiers.length === 0 || subtotal <= 0) return 0;

  // Sort tiers by up_to ascending (null / Infinity at the end)
  const sorted = [...tiers].sort((a, b) => (a.up_to ?? Infinity) - (b.up_to ?? Infinity));
  
  for (const tier of sorted) {
    if (tier.up_to === null || subtotal <= tier.up_to) {
      return Math.round(tier.fee);
    }
  }

  // Fallback to the last tier's fee
  return Math.round(sorted[sorted.length - 1].fee);
};
