/**
 * Types que coinciden con el schema de Supabase (rancho_eats)
 * Basados en las migraciones SQL 001–016
 */

// ── Enums (coinciden con los tipos de PostgreSQL) ──────────────

export type FoodType =
  | 'CARNES'
  | 'BIRRIA'
  | 'TACOS'
  | 'POLLOS'
  | 'MARISCOS'
  | 'CORRIDA'
  | 'ANTOJITOS'
  | 'OTRO';

export type RestaurantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export type PaymentMethod = 'cash' | 'oxxo' | 'card';

// ── Tables ─────────────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  email: string;
  type: FoodType;
  logo_url: string | null;
  cover_url: string | null;
  photo_url: string | null; // migration 010
  address: string | null;
  lat: number | null;
  lng: number | null;
  delivery_radius_km: number;
  zones: string[];
  open_time: string;
  close_time: string;
  is_open: boolean;
  status: RestaurantStatus;
  owner_id: string | null;
  // delivery fee tiers (migration 012)
  delivery_fee_0_10: number;
  delivery_fee_10_15: number;
  delivery_fee_15_20: number;
  delivery_fee_20_30: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  photo_url_1: string | null;
  photo_url_2: string | null;
  is_promo: boolean;
  promo_description: string | null;
  is_combo: boolean;
  combo_description: string | null;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type MenuOptionType = 'size' | 'extra';

export interface MenuItemOption {
  id: string;
  menu_item_id: string;
  label: string;
  price: number;
  option_type: MenuOptionType;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Los items se guardan como JSONB en orders.items */
export interface OrderItemJSON {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  options?: { label: string; price: number }[];
}

export interface Order {
  id: string;
  order_number: number;
  reference_code: string; // PY-XXXXXX unique identifier
  restaurant_id: string;
  client_name: string | null;
  client_phone: string | null;
  client_lat: number;
  client_lng: number;
  client_location_note: string | null;
  items: OrderItemJSON[];
  total: number;
  subtotal: number | null; // migration 011
  commission_amount: number | null; // migration 011
  delivery_amount: number; // migration 012
  status: OrderStatus;
  payment_method: string; // cash | card | oxxo
  rejection_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  client_user_id: string | null;
  // driver fields (migration 015)
  delivery_driver_id: string | null;
  delivery_driver_name: string | null;
  delivery_driver_phone: string | null;
  delivery_assigned_at: string | null;
  delivery_started_at: string | null;
  delivered_at: string | null;
  driver_last_lat: number | null;
  driver_last_lng: number | null;
  driver_location_accuracy_m: number | null;
  driver_location_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  vehicle_label: string | null;
  notes: string | null;
  is_active: boolean;
  last_location_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  driver_id: string;
  order_id: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
  recorded_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: number;
  commission_fee: number;
  created_at: string;
  updated_at: string;
}

// ── Tipos para la app movil (no existen aun en DB) ────────────

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_text: string;
  reference: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
  is_pin_location: boolean;
  created_at: string;
}

export interface Rating {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  food_rating: number;
  driver_rating: number | null;
  comment: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string;
}

// ── Cart (solo local, no en DB) ───────────────────────────────

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  notes: string;
  selected_options: MenuItemOption[];
}

export interface Cart {
  restaurant_id: string;
  restaurant_name: string;
  items: CartItem[];
  payment_method: PaymentMethod;
  delivery_address_text: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_location_note: string;
  tip_amount: number;
  pays_with: number | null;
}
