/** Bounded categories, not raw exception text (which can contain user data). */
export function technicalErrorCode(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  const m = typeof e?.message === 'string' ? e.message.toLowerCase() : '';
  if (m.includes('precios o cargos') || m.includes('precio cambió')) return 'CHECKOUT_PRICE_CHANGED';
  if (m.includes('fuera de cobertura')) return 'OUTSIDE_COVERAGE';
  if (m.includes('no está disponible') || m.includes('no disponible')) return 'UNAVAILABLE';
  if (m.includes('ubicación')) return 'INVALID_LOCATION';
  if (m.includes('network') || m.includes('fetch')) return 'NETWORK_ERROR';
  if (m.includes('timeout') || m.includes('abort')) return 'TIMEOUT';
  if (e?.code === '42501') return 'ACCESS_DENIED';
  if (e?.code === '23505') return 'CONFLICT';
  return 'CHECKOUT_UNEXPECTED';
}
