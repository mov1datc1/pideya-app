/**
 * Tipos de pedido — Pide ya
 */

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'on_the_way'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'oxxo' | 'card';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  items: OrderItem[];
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  tip: number;
  total: number;
  pays_with?: number;
  change?: number;
  delivery_address: string;
  notes?: string;
  driver_id?: string;
  created_at: string;
  updated_at: string;
}
