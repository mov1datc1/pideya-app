/**
 * Formatea un numero como precio en MXN
 * Ejemplo: 190 → "$190"
 */
export const formatPrice = (amount: number): string => {
  return `$${amount.toLocaleString('es-MX')}`;
};
