import { supabase } from './supabase';
import type { Restaurant, MenuItem, MenuItemOption } from '../types/database';

/**
 * Lista restaurantes ACTIVE.
 * Opcionalmente filtra por zona/texto.
 */
export const getRestaurants = async (zone?: string) => {
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name');

  if (zone) {
    query = query.contains('zones', [zone]);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[PideYa] getRestaurants error:', JSON.stringify(error));
    throw error;
  }
  return data as Restaurant[];
};

export const getRestaurantById = async (id: string) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[PideYa] getRestaurantById error:', JSON.stringify(error));
    throw error;
  }
  return data as Restaurant;
};

export const getMenuItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('available', true)
    .order('sort_order')
    .order('category');
  if (error) throw error;
  return data as MenuItem[];
};

export const getMenuItemOptions = async (menuItemId: string) => {
  const { data, error } = await supabase
    .from('menu_item_options')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .eq('available', true)
    .order('sort_order');
  if (error) throw error;
  return data as MenuItemOption[];
};

/** Busqueda por nombre de restaurante */
export const searchRestaurants = async (query: string) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('status', 'ACTIVE')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(20);
  if (error) throw error;
  return data as Restaurant[];
};

/** Categorias unicas de menu de un restaurante */
export const getMenuCategories = async (
  restaurantId: string,
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('category')
    .eq('restaurant_id', restaurantId)
    .eq('available', true);
  if (error) throw error;
  const unique = [...new Set((data ?? []).map((d) => d.category))];
  return unique.sort();
};
