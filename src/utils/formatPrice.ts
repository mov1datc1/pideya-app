/**
 * Formatea un numero como precio en MXN
 * Ejemplo: 190 → "$190"
 */
export const formatPrice = (amount: number): string => {
  const value = Number(amount);
  return Number.isFinite(value) && amount != null ? `$${value.toLocaleString('es-MX')}` : '—';
};
