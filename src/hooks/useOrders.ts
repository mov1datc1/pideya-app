import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { realtimeChannelName } from '../utils/realtimeChannel';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order, OrderStatus } from '../types/database';
import * as orderService from '../services/orders';
import { supabase } from '../services/supabase';
import { notifyOrderStatusChange } from './useNotifications';
import { parseAppError } from '../utils/errorHandler';

const POLL_INTERVAL = 8_000; // 8s fallback polling

export const useOrders = (clientPhone: string) => {
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const [state, setState] = useState<{ phone: string; orders: Order[]; activeOrders: Order[]; loading: boolean; error: string | null }>({ phone: clientPhone, orders: [], activeOrders: [], loading: !!clientPhone, error: null });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pagesLoaded = useRef(1);
  const pageLock = useRef(false);
  const historyRef = useRef(state);
  historyRef.current = state;
  const loadMore = useCallback(async () => {
    if (pageLock.current || !clientPhone) return;
    pageLock.current = true; setLoadingMore(true);
    const offset = historyRef.current.orders.length;
    try {
      const page = await orderService.getOrderHistory(clientPhone, offset);
      if (historyRef.current.phone !== clientPhone) return;
      setState(s => ({ ...s, orders: [...s.orders, ...page.filter(row => !s.orders.some(old => old.id === row.id))] }));
      pagesLoaded.current++;
      setHasMore(page.length === 50);
    } catch (error) {
      if (historyRef.current.phone === clientPhone) setState(s => ({ ...s, error: parseAppError(error, 'No se pudo cargar más historial') }));
    } finally { pageLock.current = false; setLoadingMore(false); }
  }, [clientPhone]);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let alive = true;
    pagesLoaded.current = 1; setHasMore(false);
    let fetching = false;
    const statuses: Record<string, string> = {};
    setState({ phone: clientPhone, orders: [], activeOrders: [], loading: !!clientPhone, error: null });
    if (!clientPhone) return;

    const fetchAll = async () => {
      if (!alive || fetching || !focusedRef.current || AppState.currentState === 'background') return;
      fetching = true;
      try {
        const [orders, activeOrders] = await Promise.all([
          orderService.getOrderHistory(clientPhone), orderService.getActiveOrders(clientPhone),
        ]);
        if (alive) {
          orders.forEach(order => { statuses[order.id] = order.status; });
          if (pagesLoaded.current === 1) setHasMore(orders.length === 50);
          setState(previous => ({ phone: clientPhone, orders: [...orders, ...previous.orders.slice(50).filter(row => !orders.some(newRow => newRow.id === row.id))], activeOrders, loading: false, error: null }));
        }
      } catch (error) {
        if (alive) setState(s => ({ ...s, loading: false, error: parseAppError(error, 'Error al cargar los pedidos') }));
      } finally { fetching = false; }
    };
    refreshRef.current = fetchAll;
    void fetchAll();
    // Each mounted tab owns its channel; unmounting one must not remove another's subscription.
    const channel = supabase.channel(realtimeChannelName('client-orders', clientPhone))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `client_phone=eq.${clientPhone}` }, payload => {
        const updated = payload.new as Order;
        if (updated?.id && updated?.status) {
          if (focusedRef.current && statuses[updated.id] && statuses[updated.id] !== updated.status) {
            notifyOrderStatusChange(updated.status, updated.order_number);
          }
          statuses[updated.id] = updated.status;
        }
        void fetchAll();
      }).subscribe();
    const timer = setInterval(fetchAll, POLL_INTERVAL);
    const appState = AppState.addEventListener('change', status => { if (status === 'active') void fetchAll(); });
    return () => { alive = false; appState.remove(); clearInterval(timer); void supabase.removeChannel(channel); };
  }, [clientPhone]);

  useEffect(() => { if (focused) void refresh(); }, [focused, refresh]);

  const visible = state.phone === clientPhone ? state : { orders: [], activeOrders: [], loading: !!clientPhone, error: null };
  return { ...visible, refresh, loadMore, hasMore, loadingMore };
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
