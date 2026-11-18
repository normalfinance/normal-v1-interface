import { createClient } from '@supabase/supabase-js';

// The project and its keys live in one place (lib/supabase-config.ts), so the
// marketing site's header reads the same session key this client writes.
import {
  SUPABASE_URL as supabaseUrl,
  SUPABASE_ANON_KEY as supabaseAnonKey,
} from './supabase-config';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export const createSupabaseClientWithUrlDetection = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
