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
  { min: 0, max: 100, fee: 8 },
  { min: 100, max: 150, fee: 10 },
  { min: 150, max: 200, fee: 12 },
  { min: 200, max: 300, fee: 15 },
  { min: 300, max: 500, fee: 18 },
  { min: 500, max: 999999, fee: 20 },
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
  if (!tiers || tiers.length === 0) return 0;

  // Sort tiers by min ascending
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const minFee = sorted[0].fee;
  const maxFee = sorted[sorted.length - 1].fee;

  // Find matching tier
  const tier = sorted.find((t) => subtotal >= t.min && subtotal < t.max);
  const fee = tier ? tier.fee : maxFee;

  // Clamp and round
  return Math.round(Math.max(minFee, Math.min(maxFee, fee)));
};
