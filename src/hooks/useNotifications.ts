import { useEffect } from 'react';
import { AppState } from 'react-native';
import { notificationV2, watchNotificationDevice } from '../services/notificationDevice';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import {
  registerForPushNotifications,
  savePushToken,
  sendLocalNotification,
} from '../services/notifications';
import type { OrderStatus } from '../types/database';

/** Human-readable status messages for local notifications */
const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  ACCEPTED: {
    title: 'Tu pedido se esta preparando! 👨‍🍳',
    body: 'El restaurante acepto tu pedido y lo esta cocinando.',
  },
  ON_THE_WAY: {
    title: 'Tu pedido va en camino! 🛵',
    body: 'Un repartidor ya esta llevando tu comida.',
  },
  DELIVERED: {
    title: 'Pedido entregado! 🎉',
    body: 'Tu comida ha llegado. Buen provecho!',
  },
  REJECTED: {
    title: 'Pedido rechazado 😔',
    body: 'Lo sentimos, el restaurante no pudo aceptar tu pedido.',
  },
  CANCELLED: {
    title: 'Pedido cancelado',
    body: 'Tu pedido ha sido cancelado.',
  },
};

/**
 * Hook to initialize push notifications on app start.
 * Registers for push token and saves it to Supabase.
 */
export const useNotificationSetup = () => {
  const { user, profile } = useAuth();
  useEffect(() => {
    if (notificationV2) return watchNotificationDevice(supabase, 'client', user?.id || null);
    if (!user?.id) return;
    let disposed = false;
    let running = false;
    const register = async () => {
      if (running || disposed) return;
      running = true;
      try {
        const token = await registerForPushNotifications();
        const { data } = await supabase.auth.getUser();
        if (!disposed && token && data.user?.id === user.id) await savePushToken(profile?.phone || '', token);
      } catch { console.warn('[Notifications] Registro pendiente; se reintentará al volver.'); }
      finally { running = false; }
    };
    void register();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void register(); });
    return () => { disposed = true; listener.remove(); };
  }, [user?.id, profile?.phone]);


};

/**
 * Send a local notification when order status changes.
 * Call this from OrderStatusScreen when realtime update arrives.
 */
export const notifyOrderStatusChange = (
  status: OrderStatus,
  orderNumber: number,
  orderId?: string,
) => {
  if (notificationV2) return; // Server outbox owns visible push alerts.
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;

  void sendLocalNotification(
    msg.title,
    `Pedido #${orderNumber} — ${msg.body}`,
    { orderId, orderNumber },
  ).catch(error => console.warn('[Notifications] No se pudo mostrar el aviso', error));
};
