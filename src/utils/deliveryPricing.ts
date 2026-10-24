import { toCoordinate } from './coordinates';
import type { Restaurant } from '../types/database';

/** Matches checkout_prices/order_admission: radius and tariff use straight-line km. */
export function deliveryPrice(business: Restaurant | null, type: string, lat: unknown, lng: unknown): number {
  if (!business) throw new Error('No pudimos consultar la tarifa del negocio. Intenta de nuevo.');
  if (type === 'pickup') return 0;
  const origin = toCoordinate(business.lat, business.lng), destination = toCoordinate(lat, lng);
  if (!origin || !destination || !(Number(business.delivery_radius_km) > 0)) throw new Error('Ubicación de entrega inválida');
  const radians = Math.PI / 180;
  const a = Math.sin((destination.latitude - origin.latitude) * radians / 2) ** 2 + Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians) * Math.sin((destination.longitude - origin.longitude) * radians / 2) ** 2;
  const distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  if (distance > Number(business.delivery_radius_km)) throw new Error('El domicilio está fuera de cobertura');
  const value = distance <= 10 ? business.delivery_fee_0_10 : distance <= 15 ? business.delivery_fee_10_15 : distance <= 20 ? business.delivery_fee_15_20 : business.delivery_fee_20_30;
  const fee = Number(value ?? 0);
  if (!Number.isFinite(fee) || fee < 0) throw new Error('No pudimos consultar la tarifa del negocio. Intenta de nuevo.');
  return fee;
}
