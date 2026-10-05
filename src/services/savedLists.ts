import { supabase } from './supabase';
import type { SavedList, OrderItemJSON } from '../types/database';

/**
 * Get all saved lists for a client.
 */
export const getSavedLists = async (clientPhone: string): Promise<SavedList[]> => {
  const { data, error } = await supabase
    .from('saved_lists')
    .select('*')
    .eq('client_phone', clientPhone)
    .order('last_used_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []) as SavedList[];
};

/**
 * Get saved lists for a specific restaurant.
 */
export const getSavedListsByRestaurant = async (
  clientPhone: string,
  restaurantId: string
): Promise<SavedList[]> => {
  const { data, error } = await supabase
    .from('saved_lists')
    .select('*')
    .eq('client_phone', clientPhone)
    .eq('restaurant_id', restaurantId)
    .order('last_used_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []) as SavedList[];
};

/**
 * Save a new list or update existing.
 */
export const saveList = async (list: Omit<SavedList, 'id' | 'created_at'>): Promise<SavedList> => {
  const { data, error } = await supabase
    .from('saved_lists')
    .insert(list)
    .select()
    .single();
  if (error) throw error;
  return data as SavedList;
};

/**
 * Toggle favorite status of a saved list.
 */
export const toggleFavorite = async (listId: string, isFavorite: boolean) => {
  const { error } = await supabase
    .from('saved_lists')
    .update({ is_favorite: !isFavorite })
    .eq('id', listId);
  if (error) throw error;
};

/**
 * Delete a saved list.
 */
export const deleteSavedList = async (listId: string) => {
  const { error } = await supabase
    .from('saved_lists')
    .delete()
    .eq('id', listId);
  if (error) throw error;
};

/**
 * Auto-save order items as a list after successful delivery.
 * Only saves if items >= 3 (meaningful list).
 */
export const autoSaveFromOrder = async (
  order: { id: string; restaurant_id: string; items: OrderItemJSON[]; client_phone: string | null },
  restaurantName: string
) => {
  if (!order.client_phone || order.items.length < 3) return;

  // Check if we already have a list from this order
  const { data: existing } = await supabase
    .from('saved_lists')
    .select('id')
    .eq('source_order_id', order.id)
    .limit(1);
  
  if (existing && existing.length > 0) return;

  // Keep only last 10 auto-saved lists
  const { data: allLists } = await supabase
    .from('saved_lists')
    .select('id')
    .eq('client_phone', order.client_phone)
    .eq('restaurant_id', order.restaurant_id)
    .eq('is_favorite', false)
    .order('created_at', { ascending: false });
  
  if (allLists && allLists.length >= 10) {
    const toDelete = allLists.slice(9).map(l => l.id);
    if (toDelete.length > 0) {
      await supabase.from('saved_lists').delete().in('id', toDelete);
    }
  }

  const now = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  
  await supabase.from('saved_lists').insert({
    client_phone: order.client_phone,
    restaurant_id: order.restaurant_id,
    name: `${restaurantName} — ${now}`,
    items: order.items,
    is_favorite: false,
    source_order_id: order.id,
    last_used_at: new Date().toISOString(),
  });
};
