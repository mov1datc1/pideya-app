/**
 * Tipos de restaurante — Pide ya
 */

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  rating: number;
  delivery_time_min: number;
  delivery_fee: number;
  minimum_order: number;
  is_open: boolean;
  town: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: string;
  is_available: boolean;
}
