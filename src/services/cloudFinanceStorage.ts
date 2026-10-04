import type { FinanceData } from '../types/finance';
import { supabase, type Json } from './supabase';
import { normalizeFinanceData } from '../components/finance';

export interface CloudFinanceRecord {
  data: FinanceData;
  localImportCompletedAt: string | null;
}

function isFinanceData(value: unknown): value is FinanceData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<FinanceData>;
  return (
    typeof data.currency === 'string' &&
    Array.isArray(data.accounts) &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.budgets)
  );
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

export async function loadCloudFinanceData(userId: string): Promise<CloudFinanceRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('finance_data')
    .select('data, local_import_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (!isFinanceData(data.data)) throw new Error('The saved cloud finance data has an unsupported format.');

  return {
    data: normalizeFinanceData(data.data),
    localImportCompletedAt: data.local_import_completed_at,
  };
}

export async function saveCloudFinanceData(userId: string, financeData: FinanceData): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('finance_data').upsert(
    {
      user_id: userId,
      data: financeData as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function markBrowserImportComplete(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('finance_data')
    .update({ local_import_completed_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
