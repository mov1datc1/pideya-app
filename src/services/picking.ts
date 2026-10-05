import { supabase } from './supabase';
import type { OrderPickingItem, PickingPreferences, FlowType } from '../types/database';

/**
 * Subscribe to picking items for an order (realtime).
 * Used by the client app to show picking progress.
 */
export const subscribeToPickingItems = (
  orderId: string,
  callback: (items: OrderPickingItem[]) => void
) => {
  // Initial fetch
  supabase
    .from('order_picking_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .then(({ data }) => {
      if (data) callback(data as OrderPickingItem[]);
    });

  // Realtime subscription
  const channel = supabase
    .channel(`picking-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'order_picking_items',
        filter: `order_id=eq.${orderId}`,
      },
      async () => {
        // Re-fetch all items on any change
        const { data } = await supabase
          .from('order_picking_items')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });
        if (data) callback(data as OrderPickingItem[]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Client responds to a picking item adjustment.
 */
export const respondToPickingItem = async (
  pickingItemId: string,
  response: 'ACCEPTED' | 'REJECTED'
) => {
  const { error } = await supabase
    .from('order_picking_items')
    .update({ client_response: response })
    .eq('id', pickingItemId);
  if (error) throw error;
};

/**
 * Client confirms the adjusted total after picking is complete.
 */
export const confirmPickingSummary = async (orderId: string) => {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'READY',
      client_confirmed_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;
};

/**
 * Get the flow_type for a restaurant based on its category.
 */
export const getFlowTypeForRestaurant = async (restaurantId: string, strict = false): Promise<FlowType> => {
  try {
    // Get restaurant type
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('type')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) throw restaurantError;
    if (!restaurant?.type) throw new Error('No se pudo verificar el tipo de establecimiento');
    // Prepared food never offers grocery substitutions, even with inconsistent metadata.
    const categoryName = restaurant.type.trim().toLowerCase();
    if (['restaurante', 'restaurantes'].includes(categoryName)) return 'prepared';
    // Tiendas represents supermarkets/abarrotes, not pharmacy (confirmed product rule).
    if (categoryName === 'tiendas') return 'picked';
    if (categoryName === 'farmacia') return 'pharmacy';

    // Get flow_type from app_categories
    const { data: category, error: categoryError } = await supabase
      .from('app_categories')
      .select('flow_type')
      .eq('name', restaurant.type)
      .single();

    if (categoryError) throw categoryError;
    const flow = category?.flow_type ?? 'prepared';
    if (!['prepared', 'picked', 'pharmacy'].includes(flow)) throw new Error('Categoría no disponible');
    return flow as FlowType;
  } catch (error) {
    if (strict) throw error;
    return 'prepared';
  }
};

/**
 * Save picking preferences to client_profiles.
 */
export const savePickingPreferences = async (
  userId: string,
  prefs: PickingPreferences
) => {
  const { error } = await supabase
    .from('client_profiles')
    .update({ picking_preferences: prefs })
    .eq('user_id', userId)
    .select('id')
    .single();
  if (error) throw error;
};

/**
 * Get picking preferences from client_profiles.
 */
export const getPickingPreferences = async (
  userId: string
): Promise<PickingPreferences | null> => {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('picking_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.picking_preferences || null;
};
