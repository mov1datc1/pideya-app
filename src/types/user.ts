/**
 * Tipos de usuario — Pide ya
 */

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  town: string;
  avatar_url?: string;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  town: string;
  lat?: number;
  lng?: number;
  reference?: string;
  is_default: boolean;
}
