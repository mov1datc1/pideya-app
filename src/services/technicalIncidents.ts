import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { technicalErrorCode } from '../utils/technicalErrorCode';

// Best effort, separate from the failed transaction. Never replaces the original error.
export async function reportCheckoutFailure(error: unknown, businessId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    await supabase.rpc('report_technical_incident', {
      p_id: Crypto.randomUUID(), p_business: businessId || null, p_app: 'client',
      p_operation: 'create_order', p_code: technicalErrorCode(error),
      p_version: Application.nativeApplicationVersion || Constants.expoConfig?.version || '',
      p_build: Application.nativeBuildVersion || '',
    }).abortSignal(controller.signal);
  } catch { /* Offline reporting must not crash checkout or retry the order. */ }
  finally { clearTimeout(timeout); }
}
