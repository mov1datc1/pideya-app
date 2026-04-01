/**
 * Formatea precio en MXN
 */
export const formatPrice = (amount: number): string =>
  `$${amount.toFixed(2)}`;

/**
 * Formatea fecha relativa (hace X minutos)
 */
export const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Hace ${diffDays}d`;
};

/**
 * Label legible para el status del pedido
 */
export const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptado',
    ON_THE_WAY: 'En camino',
    DELIVERED: 'Entregado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? status;
};

/**
 * Calcula distancia Haversine entre 2 coordenadas (km)
 */
export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Formatea distancia legible
 */
export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
