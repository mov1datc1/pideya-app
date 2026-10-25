import type { OrderStatus } from '../types/database';

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKING', 'ADJUSTED', 'ON_THE_WAY'];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Esperando confirmación', ACCEPTED: 'En preparación', PREPARING: 'En preparación', READY: 'Listo para recoger',
  PICKING: 'Surtiendo tu pedido', ADJUSTED: 'Revisa los ajustes',
  ON_THE_WAY: 'En camino', DELIVERED: 'Entregado',
  REJECTED: 'Rechazado', CANCELLED: 'Cancelado',
};
