import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY. Uses the service role key, which bypasses Row Level Security.
 * Only import this from route handlers (app/api/**) — never from a
 * 'use client' file, and never prefix the env var with NEXT_PUBLIC_.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}
