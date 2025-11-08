import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadRuntimeConfig } from './runtimeConfig';

// Hardcoded LAST-RESORT defaults (safe for client; never ship service_role key)
const DEFAULT_URL = 'https://uovqjvpluqtmrqswuyai.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdnFqdnBsdXF0bXJxc3d1eWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTU2NzcsImV4cCI6MjA3Nzc3MTY3N30.W_Auw1GN9U6q1zDHkrfkwotlq_HbSYLjsOJZ80rsnto';

let client: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  // @ts-ignore - Check Vite import.meta.env
  return import.meta?.env?.[name];
}

export function makeSupabase(): SupabaseClient {
  // Three-tier fallback priority:
  // 1. localStorage runtime overrides (for ConfigModal)
  // 2. Build-time environment variables (import.meta.env)
  // 3. Runtime global overrides (from public/env.js)
  // 4. Hardcoded defaults (last resort)
  
  const overrides = loadRuntimeConfig();
  
  const url = 
    overrides.supabaseUrl || 
    getEnv('VITE_SUPABASE_URL') || 
    (globalThis as any).__SUPABASE_URL__ || 
    DEFAULT_URL;
    
  const key = 
    overrides.supabaseAnonKey || 
    getEnv('VITE_SUPABASE_ANON_KEY') || 
    (globalThis as any).__SUPABASE_ANON_KEY__ || 
    DEFAULT_ANON;

  if (!url || !key) {
    throw new Error('Supabase configuration failed: no URL or ANON key available');
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
