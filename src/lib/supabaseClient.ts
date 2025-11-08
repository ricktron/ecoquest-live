import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Hardcoded LAST-RESORT defaults (safe for client; never ship service_role key)
const DEFAULT_URL = 'https://fceyhhzufkcqkjrjbdwl.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjZXloaHp1ZmtjcWtqcmpiZHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDk4NDAsImV4cCI6MjA3NjgyNTg0MH0.q5Eo24UxneDe5Xo-pRJmfcLd9WbJTqAtLycuDcwNoek';

let client: SupabaseClient | null = null;

export function makeSupabase(): SupabaseClient {
  // Three-tier fallback priority:
  // 1. Build-time environment variables (import.meta.env)
  // 2. Runtime global overrides (from public/env.js)
  // 3. Hardcoded defaults (last resort)
  
  const url = 
    import.meta.env.VITE_SUPABASE_URL || 
    (globalThis as any).__SUPABASE_URL__ || 
    DEFAULT_URL;
    
  const key = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    (globalThis as any).__SUPABASE_ANON_KEY__ || 
    DEFAULT_ANON;

  if (!url || !key) {
    throw new Error('Supabase configuration failed: no URL or ANON key available');
  }

  // Mismatch guard: ensure JWT ref matches URL host
  function jwtRef(key: string) {
    try { return JSON.parse(atob(key.split('.')[1]))?.ref as string | undefined; }
    catch { return undefined; }
  }

  const hostRef = new URL(url).host.split('.')[0];
  const keyRef = jwtRef(key);

  if (keyRef && keyRef !== hostRef) {
    throw new Error(`Supabase URL/key mismatch: url=${hostRef} key=${keyRef}`);
  }

  // One-time runtime fingerprint (remove after verification)
  const _src = import.meta.env.VITE_SUPABASE_URL
    ? 'VITE'
    : (globalThis as any).__SUPABASE_URL__
      ? 'ENVJS'
      : 'DEFAULTS';
  const _fp = (key || '').slice(0, 4) + '...' + (key || '').slice(-4);
  console.info('[Supabase] using', _src, hostRef, 'key', _fp);
  
  const client = createClient(url, key);
  
  // Global export for debugging
  if (typeof window !== 'undefined') (window as any).supabase = client;
  
  return client;
}

export function supabase(): SupabaseClient {
  if (!client) client = makeSupabase();
  return client;
}

export function recreateSupabase() {
  client = makeSupabase();
  return client;
}
