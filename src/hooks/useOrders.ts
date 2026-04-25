import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order, OrderStatus } from '../types/database';
import * as orderService from '../services/orders';
import { supabase } from '../services/supabase';
import { notifyOrderStatusChange } from './useNotifications';

const POLL_INTERVAL = 8_000; // 8s fallback polling

export const useOrders = (clientPhone: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track known statuses to detect changes and send notifications
  const statusMapRef = useRef<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    if (!clientPhone) return;
    try {
      const [history, active] = await Promise.all([
        orderService.getOrderHistory(clientPhone),
        orderService.getActiveOrders(clientPhone),
      ]);
      setOrders(history);
      setActiveOrders(active);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [clientPhone]);

  useEffect(() => {
    fetchAll();

    // Realtime subscription with unique channel name
    const channel = supabase
      .channel(`client-orders-${clientPhone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_phone=eq.${clientPhone}`,
        },
        (payload) => {
          // Send local notification on status change
          const updated = payload.new as Order;
          if (updated?.id && updated?.status) {
            const prevStatus = statusMapRef.current[updated.id];
            if (prevStatus && prevStatus !== updated.status) {
              // Status changed! Send notification
              notifyOrderStatusChange(
                updated.status as OrderStatus,
                updated.order_number,
              );
            }
            statusMapRef.current[updated.id] = updated.status;
          }

          // Re-fetch all orders to update UI
          fetchAll();
        },
      )
      .subscribe();

    // Fallback polling
    pollRef.current = setInterval(() => {
      if (clientPhone) fetchAll();
    }, POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [clientPhone, fetchAll]);

  return {
    orders,
    activeOrders,
    loading,
    error,
    refresh: fetchAll,
  };
};

export const useOrderTracking = (orderId: string | null) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Fetch inicial
    orderService
      .getOrderById(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Suscripcion realtime
    const unsubscribe = orderService.subscribeToOrderStatus(
      orderId,
      (updated) => setOrder(updated),
    );

    return unsubscribe;
  }, [orderId]);

  return { order, loading };
};
