import { Coordinate } from './coordinates';

export function locationFreshness(updatedAt: string | null | undefined, now: number) {
  const time = Date.parse(updatedAt ?? '');
  // Allow a little clock drift; a future timestamp must not stay fresh indefinitely.
  if (!Number.isFinite(time) || time > now + 60_000) return { stale: true, label: 'Ubicación sin hora confirmada' };
  const age = Math.max(0, now - time);
  const minutes = Math.floor(age / 60_000);
  return { stale: age > 90_000, label: age < 60_000 ? 'Ubicación actualizada hace un momento' : `Ubicación recibida hace ${minutes} min` };
}

export function markerAnimationDuration(from: Coordinate, to: Coordinate, previousAt: string | null | undefined, updatedAt: string | null | undefined, now: number): number {
  const gap = Date.parse(updatedAt ?? '') - Date.parse(previousAt ?? '');
  if (locationFreshness(updatedAt, now).stale || !Number.isFinite(gap) || gap <= 0 || gap > 30_000) return 0;
  const radians = Math.PI / 180;
  const a = Math.sin((to.latitude - from.latitude) * radians / 2) ** 2 + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin((to.longitude - from.longitude) * radians / 2) ** 2;
  const meters = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  // Smooth short GPS updates only. Never animate a long straight trip after reconnecting.
  return meters <= 150 ? 1500 : 0;
}
