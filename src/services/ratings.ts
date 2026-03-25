/**
 * Servicio de calificaciones.
 *
 * NOTA: La DB de rancho_eats aun NO tiene tabla de ratings.
 * Se incluye la migracion SQL necesaria en supabase/migrations/.
 * Mientras tanto, las funciones estan preparadas para cuando exista la tabla.
 */
import { supabase } from './supabase';
import type { Rating } from '../types/database';

export const rateOrder = async (data: {
  order_id: string;
  user_id: string;
  restaurant_id: string;
  food_rating: number;
  driver_rating?: number;
  comment?: string;
}): Promise<Rating> => {
  const { data: rating, error } = await supabase
    .from('ratings')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return rating as Rating;
};

export const getRestaurantRatings = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as Rating[];
};

export const hasRatedOrder = async (orderId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);
  if (error) return false;
  return (count ?? 0) > 0;
};
