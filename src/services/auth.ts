import { supabase } from './supabase';
import type { UserProfile } from '../types/database';

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
