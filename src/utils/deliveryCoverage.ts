import type { Restaurant } from '../types/database';
import { toCoordinate } from './coordinates';
export function deliversTo(restaurant: Pick<Restaurant, 'lat' | 'lng' | 'delivery_radius_km'>, lat: number, lng: number): boolean {
  const from = toCoordinate(restaurant.lat, restaurant.lng);
  const to = toCoordinate(lat, lng);
  const radius = Number(restaurant.delivery_radius_km);
  if (!from || !to || !Number.isFinite(radius) || radius <= 0) return false;
  const radians = (n: number) => n * Math.PI / 180;
  const a = Math.sin(radians(to.latitude - from.latitude) / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(radians(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) <= radius;
}
export function matchesCategory(type: string, category: string): boolean {
  return type.trim().toLocaleLowerCase('es') === category.trim().toLocaleLowerCase('es');
}
