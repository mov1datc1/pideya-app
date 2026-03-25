/**
 * Tokens de color — Pide ya
 * Inspirados en el agave azul Weber y la tierra tequilera
 */

export const colors = {
  // Primarios — Agave
  agave: '#2D8B7A',
  'agave-dark': '#1E6B5E',
  'agave-deep': '#145249',
  'agave-light': '#E8F5F2',
  'agave-soft': '#D0EBE6',
  'agave-mid': '#5BA899',

  // Secundarios — Tierra
  tierra: '#C4956A',
  'tierra-dark': '#A67A52',
  'tierra-light': '#FDF6F0',

  // Semanticos
  error: '#E03131',
  'error-bg': '#FFF5F5',
  warning: '#F59F00',
  'warning-bg': '#FFF9DB',

  // Neutros
  white: '#FFFFFF',
  snow: '#F8F9FA',
  cloud: '#F1F3F5',
  silver: '#E9ECEF',
  ink: '#1A1D21',
  'ink-secondary': '#495057',
  'ink-muted': '#868E96',
  'ink-hint': '#ADB5BD',
} as const;

export type ColorToken = keyof typeof colors;
