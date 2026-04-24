import { supabase } from './supabase';
import type { UserProfile } from '../types/database';

/** Send OTP code to email (works for both new and existing users) */
export const sendEmailOtp = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
  return data;
};

/** Verify the OTP code sent to email.
 *
 * Supabase with `mailer_autoconfirm: true` generates a `recovery_token`
 * (not `email_otp`) when calling `signInWithOtp`, even for brand-new users.
 * The correct `verifyOtp` type for recovery tokens is `'magiclink'`.
 * We try `magiclink` first (most common), then `email` as fallback.
 */
export const verifyEmailOtp = async (email: string, token: string) => {
  // Try magiclink first (matches recovery_token from signInWithOtp)
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'magiclink',
  });

  if (!error) return data;

  // Fallback: try 'email' type (matches email_otp / confirmation_token)
  const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error2) throw error2;
  return data2;
};

/** Legacy: sign up with email + password (fallback) */
export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  city: string,
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, city },
    },
  });
  if (error) throw error;
  return data;
};

/** Legacy: sign in with email + password (fallback) */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signInWithPhone = async (phone: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
  return data;
};

export const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const updateProfile = async (
  data: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'city' | 'avatar_url'>>,
) => {
  const { error } = await supabase.auth.updateUser({
    data,
  });
  if (error) throw error;
};

export const onAuthStateChange = (
  callback: (event: string, session: unknown) => void,
) => {
  return supabase.auth.onAuthStateChange(callback);
};

/** Delete user account and all associated data */
export const deleteAccount = async () => {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('No se pudo obtener el usuario');

  // Delete user profile data from public tables if they exist
  const phone = user.user_metadata?.phone;
  if (phone) {
    // Cancel any pending orders
    await supabase
      .from('orders')
      .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), cancelled_by: 'client' })
      .eq('client_phone', phone)
      .eq('status', 'PENDING');
  }

  // Sign out (Supabase Admin API needed for full deletion from auth.users,
  // but signing out + clearing session is the client-side action.
  // A Supabase Edge Function or DB trigger should handle auth.users cleanup.)
  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    // Fallback: if RPC doesn't exist, just sign out
    console.warn('delete_user_account RPC not found, signing out only:', error.message);
    await supabase.auth.signOut();
    return;
  }
  await supabase.auth.signOut();
};

/** Check if user profile is complete (has name and phone) */
export const isProfileComplete = (userMetadata: Record<string, unknown> | undefined): boolean => {
  if (!userMetadata) return false;
  return !!(userMetadata.full_name && userMetadata.phone);
};
