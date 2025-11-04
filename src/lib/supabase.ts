import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

export const supa = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Legacy export for backward compatibility
export const supabase = supa;

export const DEFAULT_AID = env.VITE_DEFAULT_ASSIGNMENT_ID;
