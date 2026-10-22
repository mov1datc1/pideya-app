import type { FlowType, PickingPreferences } from '../types/database';

export function orderPickingPreferences(flow: FlowType, preferences: PickingPreferences): PickingPreferences | undefined {
  if (flow === 'prepared') return undefined;
  if (flow === 'pharmacy') return { ...preferences, on_unavailable: 'ask_me', on_less_quantity: 'ask_me' };
  return { ...preferences, on_unavailable: 'remove', on_less_quantity: preferences.on_less_quantity === 'remove' ? 'remove' : 'accept_available' };
}
