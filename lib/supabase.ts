import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud on purpose — a silent misconfiguration here is confusing to debug later.
  throw new Error(
    'Missing Supabase env vars. Copy .env.local.example to .env.local and fill in your project URL and anon key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
