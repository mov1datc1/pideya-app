import { useState, useEffect, useCallback } from 'react';
import type { Order } from '../types/database';
import * as orderService from '../services/orders';

export const useOrders = (clientPhone: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!clientPhone) return;
    setLoading(true);
    try {
      const data = await orderService.getOrderHistory(clientPhone);
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [clientPhone]);

  const fetchActive = useCallback(async () => {
    if (!clientPhone) return;
    try {
      const data = await orderService.getActiveOrders(clientPhone);
      setActiveOrders(data);
    } catch {
      // silent — active orders are secondary
    }
  }, [clientPhone]);

  useEffect(() => {
    fetchHistory();
    fetchActive();
  }, [fetchHistory, fetchActive]);

  return { orders, activeOrders, loading, error, refresh: fetchHistory };
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
