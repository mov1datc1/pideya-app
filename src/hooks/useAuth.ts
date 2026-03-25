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
    // Obtener sesion inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    // Escuchar cambios de auth
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
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      city: string,
    ) => {
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

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    clearError,
    isAuthenticated: !!state.session,
    /** Datos del perfil guardados en user_metadata */
    profile: state.user?.user_metadata as
      | { full_name?: string; phone?: string; city?: string; avatar_url?: string }
      | undefined,
  };
};
