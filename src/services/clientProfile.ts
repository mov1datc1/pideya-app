import { supabase } from './supabase';

export interface ClientProfile {
  id: string;
  user_id: string;
  phone: string;
  consecutive_cancellations: number;
  total_cancellations: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  reputation_score: number;
}

/** Get or create a client profile for the current user */
export const getOrCreateClientProfile = async (
  userId: string,
  phone: string,
): Promise<ClientProfile> => {
  // Try to find existing profile
  const { data: existing } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing as ClientProfile;

  // Create new profile
  const { data, error } = await supabase
    .from('client_profiles')
    .insert({ user_id: userId, phone })
    .select()
    .single();

  if (error) throw error;
  return data as ClientProfile;
};

/** Check if user is blocked */
export const checkUserBlocked = async (phone: string): Promise<{
  isBlocked: boolean;
  reason: string | null;
  consecutiveCancellations: number;
}> => {
  const { data } = await supabase
    .from('client_profiles')
    .select('is_blocked, blocked_reason, consecutive_cancellations')
    .eq('phone', phone)
    .maybeSingle();

  if (!data) {
    return { isBlocked: false, reason: null, consecutiveCancellations: 0 };
  }

  return {
    isBlocked: data.is_blocked,
    reason: data.blocked_reason,
    consecutiveCancellations: data.consecutive_cancellations,
  };
};
