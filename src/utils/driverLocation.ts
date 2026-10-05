import type { DriverLocation, Order } from '../types/database';
import { toCoordinate } from './coordinates';

export function latestDriverLocation(order: Order | null, location: DriverLocation | null) {
  const orderPoint = toCoordinate(order?.driver_last_lat, order?.driver_last_lng);
  const orderTime = Date.parse(order?.driver_location_updated_at ?? '') || 0;
  const driverPoint = toCoordinate(location?.lat, location?.lng);
  const driverTime = Date.parse(location?.updated_at || location?.recorded_at || '') || 0;
  const belongsToOrder = !!order?.delivery_driver_id && location?.driver_id === order.delivery_driver_id && (!location.order_id || location.order_id === order.id);
  if (belongsToOrder && driverPoint && (!orderPoint || driverTime > orderTime)) return { ...driverPoint, updatedAt: location!.updated_at || location!.recorded_at };
  return orderPoint ? { ...orderPoint, updatedAt: order?.driver_location_updated_at ?? null } : null;
}
