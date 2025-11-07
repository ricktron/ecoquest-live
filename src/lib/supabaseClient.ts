import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadRuntimeConfig } from './runtimeConfig';

let client: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  // Vite-style and plain fallbacks
  // @ts-ignore
  return import.meta?.env?.[name] || (window as any)?.[name];
}

export function makeSupabase(): SupabaseClient {
  const overrides = loadRuntimeConfig();
  const url = overrides.supabaseUrl || getEnv('VITE_SUPABASE_URL');
  const key = overrides.supabaseAnonKey || getEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !key) {
    // Create a dummy client that will always error clearly
    // but we still return an object so calls don't crash.
    const dummy = {
      rpc: async () => ({ data: null, error: new Error('Supabase URL/ANON not set') }),
      from: () => ({
        select: async () => ({ data: null, error: new Error('Supabase URL/ANON not set') })
      })
    } as any as SupabaseClient;
    return dummy;
  }
  return createClient(url, key);
}

export function supabase(): SupabaseClient {
  if (!client) client = makeSupabase();
  return client;
}

export function recreateSupabase() {
  client = makeSupabase();
  return client;
}
