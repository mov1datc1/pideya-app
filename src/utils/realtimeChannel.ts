let sequence = 0;

/** Supabase reuses channel objects by name; each subscriber needs its own lifecycle. */
export function realtimeChannelName(scope: string, id: string): string {
  return `${scope}-${id}-${++sequence}`;
}
