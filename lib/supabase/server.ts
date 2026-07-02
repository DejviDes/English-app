import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the SERVICE ROLE key. It bypasses RLS
// (the DB is deny-all for everyone else) and must NEVER reach a client bundle.
let cached: SupabaseClient | null = null;

export function createServerClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === 'PASTE_SERVICE_ROLE_KEY_HERE') {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill them in .env.local ' +
        '(service_role secret from the Supabase dashboard).',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
