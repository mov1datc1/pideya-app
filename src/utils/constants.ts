/**
 * Constantes de la app — Pide ya
 */

export const TOWNS = [
  'Tepatitlan',
  'Arandas',
  'San Miguel El Alto',
  'Atotonilco',
  'Jalostotitlan',
  'San Julian',
] as const;

export type Town = (typeof TOWNS)[number];

export const TIP_OPTIONS = [10, 20, 30] as const;

export const APP_VERSION = '1.0.0';
