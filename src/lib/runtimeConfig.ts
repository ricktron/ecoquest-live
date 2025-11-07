export type RuntimeConfig = { supabaseUrl?: string; supabaseAnonKey?: string; };
const K_URL = 'eql.supabase.url';
const K_KEY = 'eql.supabase.key';

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: localStorage.getItem(K_URL) || undefined,
    supabaseAnonKey: localStorage.getItem(K_KEY) || undefined,
  };
}

export function saveRuntimeConfig(cfg: RuntimeConfig) {
  if (cfg.supabaseUrl != null) localStorage.setItem(K_URL, cfg.supabaseUrl);
  if (cfg.supabaseAnonKey != null) localStorage.setItem(K_KEY, cfg.supabaseAnonKey);
}

export function clearRuntimeConfig() {
  localStorage.removeItem(K_URL);
  localStorage.removeItem(K_KEY);
}
