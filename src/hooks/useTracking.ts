import { useState, useEffect } from 'react';
import type { DriverLocation, Order } from '../types/database';
import * as trackingService from '../services/tracking';
import { latestDriverLocation } from '../utils/driverLocation';
import { getOrderById } from '../services/orders';

type State = { id: string | null; driverLocation: DriverLocation | null; order: Order | null; loading: boolean };
export const useTracking = (orderId: string | null) => {
  const [state, setState] = useState<State>({ id: null, driverLocation: null, order: null, loading: false });
  useEffect(() => {
    let alive = true;
    let driverId: string | null = null;
    let driverUnsub: (() => void) | undefined;
    let revision = 0;
    setState({ id: orderId, driverLocation: null, order: null, loading: !!orderId });
    if (!orderId) return;
    const accept = (order: Order) => {
      if (!alive) return;
      const changedDriver = driverId !== (order.delivery_driver_id ?? null);
      setState(s => ({ ...s, order: s.order ? { ...s.order, ...order } : order, loading: false, driverLocation: changedDriver ? null : s.driverLocation }));
      if (changedDriver) {
        driverUnsub?.();
        driverId = order.delivery_driver_id ?? null;
        if (driverId) {
          const subscribedDriver = driverId;
          driverUnsub = trackingService.subscribeToDriverLocation(driverId, location => {
            if (alive && subscribedDriver === driverId) setState(s => ({ ...s, driverLocation: location }));
          });
        }
      }
    };
    const unsub = trackingService.subscribeToOrderTracking(orderId, order => { revision++; accept(order); });
    let fetching = false;
    const fetchOrder = async () => {
      if (fetching) return;
      fetching = true;
      const startRevision = revision;
      try {
        const order = await getOrderById(orderId);
        if (startRevision === revision) accept(order);
      } catch {
        if (alive) setState(s => ({ ...s, loading: false }));
      } finally { fetching = false; }
    };
    void fetchOrder();
    const timer = setInterval(fetchOrder, 10_000);
    return () => { alive = false; clearInterval(timer); unsub(); driverUnsub?.(); };
  }, [orderId]);
  const current = state.id === orderId ? state : { driverLocation: null, order: null, loading: !!orderId };
  const position = latestDriverLocation(current.order, current.driverLocation);
  return {
    ...current,
    driverLat: position?.latitude ?? null,
    driverLng: position?.longitude ?? null,
    driverUpdatedAt: position?.updatedAt ?? null,
    hasDriver: !!current.order?.delivery_driver_id,
    isDelivered: current.order?.status === 'DELIVERED',
  };
};
