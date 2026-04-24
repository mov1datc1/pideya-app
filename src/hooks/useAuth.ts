import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import * as authService from '../services/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  // Legacy password auth (kept as fallback)
  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.signIn(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesion';
      setState((s) => ({ ...s, error: message, loading: false }));
      throw err;
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone: string, city: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await authService.signUp(email, password, fullName, phone, city);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrarse';
        setState((s) => ({ ...s, error: message, loading: false }));
        throw err;
      }
    },
    [],
  );

  // Email OTP
  const sendOtp = useCallback(async (email: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.sendEmailOtp(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar codigo';
      setState((s) => ({ ...s, error: message, loading: false }));
      throw err;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.verifyEmailOtp(email, token);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      let message = 'Codigo incorrecto o expirado';
      if (raw.toLowerCase().includes('expired')) {
        message = 'El codigo ya expiro. Toca "Reenviar codigo" para recibir uno nuevo.';
      } else if (raw.toLowerCase().includes('invalid') || raw.toLowerCase().includes('token')) {
        message = 'El codigo no es valido. Verifica los 6 digitos que recibiste por email.';
      } else if (raw) {
        message = raw;
      }
      setState((s) => ({ ...s, error: message, loading: false }));
      throw err;
    }
  }, []);

  // Google OAuth
  const googleSignIn = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.signInWithGoogle();
      // Auth state change will handle session update
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      let message = 'Error al iniciar sesion con Google';
      if (raw.includes('cancelado') || raw.includes('cancel')) {
        // User cancelled — don't show error
        setState((s) => ({ ...s, loading: false }));
        return;
      } else if (raw) {
        message = raw;
      }
      setState((s) => ({ ...s, error: message, loading: false }));
      throw err;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const updateProfile = useCallback(async (data: { full_name?: string; phone?: string; city?: string }) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.updateProfile(data);
      // Refresh user data
      const { data: { user } } = await supabase.auth.getUser();
      setState((s) => ({ ...s, user, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil';
      setState((s) => ({ ...s, error: message, loading: false }));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await authService.signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesion';
      setState((s) => ({ ...s, error: message, loading: false }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const profile = state.user?.user_metadata as
    | { full_name?: string; phone?: string; city?: string; avatar_url?: string }
    | undefined;

  return {
    ...state,
    signIn,
    signUp,
    sendOtp,
    verifyOtp,
    googleSignIn,
    updateProfile,
    signOut,
    clearError,
    isAuthenticated: !!state.session,
    isProfileComplete: !!(profile?.full_name && profile?.phone),
    profile,
  };
};
