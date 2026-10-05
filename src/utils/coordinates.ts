export type Coordinate = { latitude: number; longitude: number };

// Supabase numeric fields and legacy rows can contain strings, nulls or invalid values.
export function toCoordinate(lat: unknown, lng: unknown): Coordinate | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  if (!['number', 'string'].includes(typeof lat) || !['number', 'string'].includes(typeof lng)) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // Existing orders use 0,0 as the sentinel for a missing delivery pin.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}
