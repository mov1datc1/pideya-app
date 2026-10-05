import type { OrderStatus } from '../types/database';

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PICKING', 'ADJUSTED', 'ON_THE_WAY'];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Esperando confirmación', ACCEPTED: 'En preparación',
  PICKING: 'Surtiendo tu pedido', ADJUSTED: 'Revisa los ajustes',
  ON_THE_WAY: 'En camino', DELIVERED: 'Entregado',
  REJECTED: 'Rechazado', CANCELLED: 'Cancelado',
};
