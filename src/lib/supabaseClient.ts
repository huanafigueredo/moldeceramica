import { createClient } from '@supabase/supabase-js';

// Fallback to the deployed project's own anon key when VITE_SUPABASE_* env vars
// aren't configured on the hosting platform. Safe to keep here: this is the
// public/anon key, meant to be exposed client-side — access is enforced by the
// Row Level Security policies on each table, not by keeping this key secret.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tldwhxhrusrnuhpusmwq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LLIJ3086i06XKrWDN4QUBA_k5v_sAT1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
