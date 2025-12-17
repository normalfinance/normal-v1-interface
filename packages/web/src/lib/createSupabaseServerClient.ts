import { cookies } from 'next/headers';
import { constants } from '@normalfinance/utils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL! || ''
);

const supabaseAnonKey = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Create a Supabase client for server-side use in API routes.
 * This client reads the session from cookies to authenticate requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(accessToken?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
