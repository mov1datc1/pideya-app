import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
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
  const { profile } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    (async () => {
      const token = await registerForPushNotifications();
      if (token && profile?.phone) {
        await savePushToken(profile.phone, token);
      }
    })();
  }, [profile?.phone]);

  // Listen for notification taps (for future deep linking)
  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Could navigate to order status screen here
      console.log('Notification tapped:', data);
    });
    return () => sub.remove();
  }, []);
};

/**
 * Send a local notification when order status changes.
 * Call this from OrderStatusScreen when realtime update arrives.
 */
export const notifyOrderStatusChange = (
  status: OrderStatus,
  orderNumber: number,
) => {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;

  sendLocalNotification(
    msg.title,
    `Pedido #${orderNumber} — ${msg.body}`,
    { orderId: String(orderNumber) },
  );
};
