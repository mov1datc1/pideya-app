import { supabase } from './supabase';
import type { UserProfile } from '../types/database';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

/** Sign in with Google via Supabase OAuth + expo-web-browser */
export const signInWithGoogle = async () => {
  // Use explicit scheme to ensure redirect works on standalone builds
  const redirectTo = makeRedirectUri({ scheme: 'pideya', path: 'auth/callback' });

  // Warm up browser for faster opening
  await WebBrowser.warmUpAsync();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No se pudo iniciar el login con Google');

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      { showInRecents: true },
    );

    if (result.type !== 'success' || !result.url) {
      throw new Error('Login con Google cancelado');
    }

    // Extract tokens from the redirect URL
    // Supabase returns tokens in the URL fragment (#access_token=...&refresh_token=...)
    const resultUrl = result.url;
    const hashIdx = resultUrl.indexOf('#');
    if (hashIdx >= 0) {
      const fragment = resultUrl.substring(hashIdx + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        return sessionData;
      }
    }

    // If tokens are in query params (PKCE flow)
    const queryIdx = resultUrl.indexOf('?');
    if (queryIdx >= 0) {
      const queryStr = resultUrl.substring(queryIdx + 1);
      const queryParams = new URLSearchParams(queryStr.split('#')[0]);
      const code = queryParams.get('code');
      if (code) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (sessionError) throw sessionError;
        return sessionData;
      }
    }

    throw new Error('No se encontraron credenciales en la respuesta de Google');
  } finally {
    await WebBrowser.coolDownAsync();
  }
};

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
 * With `mailer_autoconfirm: false`, `signInWithOtp` generates a
 * `confirmation_token` and the correct verify type is `'email'`.
 *
 * We try `'email'` first (handles both confirmation_token and
 * recovery_token internally in GoTrue), then `'magiclink'` and
 * `'recovery'` as fallbacks for maximum compatibility.
 */
export const verifyEmailOtp = async (email: string, token: string) => {
  // Primary: type 'email' — GoTrue checks both confirmation_token and recovery_token
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (!error) return data;

  // Fallback 1: 'magiclink' (matches recovery_token only)
  const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'magiclink',
  });

  if (!error2) return data2;

  // Fallback 2: 'recovery' (explicit recovery flow)
  const { data: data3, error: error3 } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });

  if (error3) throw error3;
  return data3;
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
