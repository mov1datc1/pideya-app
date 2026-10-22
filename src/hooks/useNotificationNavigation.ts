import { useEffect } from 'react';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../services/supabase';

// Both cold start and notification taps wait until the authenticated navigator is ready.
export function useNotificationNavigation(ref: NavigationContainerRefWithCurrent<RootStackParamList>, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    const seen = new Set<string>();
    const open = async (response: Notifications.NotificationResponse | null) => {
      const eventId = response?.notification.request.content.data?.eventId;
      if (typeof eventId !== 'string' || seen.has(eventId)) return;
      seen.add(eventId);
      try {
        // Authorize through inbox RLS, never trust an arbitrary orderId from a push.
        const { data, error } = await supabase.from('notification_events').select('order_id').eq('id', eventId).maybeSingle();
        if (error) { seen.delete(eventId); return; }
        if (!data || disposed || !ref.isReady()) return;
        ref.navigate('OrderStatus', { orderId: data.order_id });
        await supabase.rpc('open_notification', { p_id: eventId });
        await Notifications.clearLastNotificationResponseAsync();
      } catch { seen.delete(eventId); }
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(response => { void open(response); });
    return () => { disposed = true; subscription.remove(); };
  }, [ready, ref]);
}
