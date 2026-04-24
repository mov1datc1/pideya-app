import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order } from '../types/database';
import * as orderService from '../services/orders';
import { supabase } from '../services/supabase';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'ON_THE_WAY'];
const POLL_INTERVAL = 10_000; // 10s fallback polling

export const useOrders = (clientPhone: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Realtime subscription: listen for any changes in orders table
    // Filter by client_phone to only receive relevant updates
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_phone=eq.${clientPhone}`,
        },
        () => {
          // Re-fetch all orders when any change is detected
          fetchAll();
        },
      )
      .subscribe();

    // Fallback polling every 10s for active orders
    pollRef.current = setInterval(() => {
      if (clientPhone) fetchAll();
    }, POLL_INTERVAL);

    return () => {
      channel.unsubscribe();
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
