import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client with service role (for agents)
export function createServerClient(schema: 'amygdala' | 'meridian' = 'amygdala'): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: { persistSession: false },
    db: { schema }
  });
}

// Client for Amygdala schema
export function getAmygdalaClient(): SupabaseClient {
  return createServerClient('amygdala');
}

// Client for Meridian schema
export function getMeridianClient(): SupabaseClient {
  return createServerClient('meridian');
}
