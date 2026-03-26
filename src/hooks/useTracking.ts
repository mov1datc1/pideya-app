import { useState, useEffect } from 'react';
import type { DriverLocation, Order } from '../types/database';
import * as trackingService from '../services/tracking';

interface TrackingState {
  driverLocation: DriverLocation | null;
  order: Order | null;
  loading: boolean;
}

export const useTracking = (orderId: string | null) => {
  const [state, setState] = useState<TrackingState>({
    driverLocation: null,
    order: null,
    loading: true,
  });

  useEffect(() => {
    if (!orderId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Suscripcion al pedido (incluye driver lat/lng)
    const unsubOrder = trackingService.subscribeToOrderTracking(
      orderId,
      (order) => {
        setState((s) => ({ ...s, order, loading: false }));

        // Si el pedido tiene driver asignado, suscribirse a su ubicacion
        if (order.delivery_driver_id && !driverUnsub) {
          startDriverSub(order.delivery_driver_id);
        }
      },
    );

    let driverUnsub: (() => void) | null = null;

    const startDriverSub = (driverId: string) => {
      driverUnsub = trackingService.subscribeToDriverLocation(
        driverId,
        (location) => {
          setState((s) => ({ ...s, driverLocation: location }));
        },
      );
    };

    return () => {
      unsubOrder();
      driverUnsub?.();
    };
  }, [orderId]);

  return {
    ...state,
    driverLat: state.driverLocation?.lat ?? state.order?.driver_last_lat ?? null,
    driverLng: state.driverLocation?.lng ?? state.order?.driver_last_lng ?? null,
    hasDriver: !!state.order?.delivery_driver_id,
    isDelivered: state.order?.status === 'DELIVERED',
  };
};
