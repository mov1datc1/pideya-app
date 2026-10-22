import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { realtimeChannelName } from '../utils/realtimeChannel';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order, OrderStatus } from '../types/database';
import * as orderService from '../services/orders';
import { supabase } from '../services/supabase';
import { notifyOrderStatusChange } from './useNotifications';
import { parseAppError } from '../utils/errorHandler';

const POLL_INTERVAL = 15_000; // Used only while Realtime is unavailable.
const orderSummaryKey = (order: Order) => JSON.stringify([
  order.status, order.total, order.adjusted_total, order.delivery_driver_id,
]);

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
    let realtimeHealthy = false;
    let fetchFailed = false;
    let refreshQueued = false;
    const statuses: Record<string, string> = {};
    const summaries: Record<string, string> = {};
    setState({ phone: clientPhone, orders: [], activeOrders: [], loading: !!clientPhone, error: null });
    if (!clientPhone) return;

    const fetchAll = async () => {
      if (!alive || !focusedRef.current || AppState.currentState === 'background') return;
      if (fetching) { refreshQueued = true; return; }
      fetching = true;
      try {
        const [orders, activeOrders] = await Promise.all([
          orderService.getOrderHistory(clientPhone), orderService.getActiveOrders(clientPhone),
        ]);
        if (alive) {
          fetchFailed = false;
          orders.forEach(order => { statuses[order.id] = order.status; summaries[order.id] = orderSummaryKey(order); });
          if (pagesLoaded.current === 1) setHasMore(orders.length === 50);
          setState(previous => ({ phone: clientPhone, orders: [...orders, ...previous.orders.slice(50).filter(row => !orders.some(newRow => newRow.id === row.id))], activeOrders, loading: false, error: null }));
        }
      } catch (error) {
        fetchFailed = true;
        if (alive) setState(s => ({ ...s, loading: false, error: parseAppError(error, 'Error al cargar los pedidos') }));
      } finally {
        fetching = false;
        if (refreshQueued && alive) { refreshQueued = false; void fetchAll(); }
      }
    };
    refreshRef.current = fetchAll;
    void fetchAll();
    // Each mounted tab owns its channel; unmounting one must not remove another's subscription.
    const channel = supabase.channel(realtimeChannelName('client-orders', clientPhone))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `client_phone=eq.${clientPhone}` }, payload => {
        const updated = payload.new as Order;
        if (updated?.id && updated?.status) {
          const summary = orderSummaryKey(updated);
          // GPS writes belong to the tracking map, not history/catalog refreshes.
          if (summaries[updated.id] === summary) return;
          summaries[updated.id] = summary;
          if (focusedRef.current && statuses[updated.id] && statuses[updated.id] !== updated.status) {
            notifyOrderStatusChange(updated.status, updated.order_number, updated.id);
          }
          statuses[updated.id] = updated.status;
        }
        void fetchAll();
      }).subscribe(status => {
        realtimeHealthy = status === 'SUBSCRIBED';
        if (realtimeHealthy) void fetchAll(); // Reconcile missed events on reconnect.
      });
    const timer = setInterval(() => { if (!realtimeHealthy || fetchFailed) void fetchAll(); }, POLL_INTERVAL + Math.random() * 5000);
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
