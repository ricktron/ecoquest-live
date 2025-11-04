import { createClient } from '@supabase/supabase-js';
import { ENV } from '../env';

export const supa = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Legacy export for backward compatibility
export const supabase = supa;

export const DEFAULT_AID = ENV.DEFAULT_ASSIGNMENT_ID;
export const DEFAULT_ASSIGNMENT_ID = ENV.DEFAULT_ASSIGNMENT_ID;
