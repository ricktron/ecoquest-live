import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!url) throw new Error('Missing env: VITE_SUPABASE_URL');
if (!anon) throw new Error('Missing env: VITE_SUPABASE_ANON_KEY');

export const supa = createClient(url, anon, {
  auth: { persistSession: false },
});

// Legacy export for backward compatibility
export const supabase = supa;

export const DEFAULT_AID = import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID!;
