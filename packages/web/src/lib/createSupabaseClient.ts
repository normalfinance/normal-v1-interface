// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { logger, constants } from '@normalfinance/utils';

const supabaseUrl = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL! || ''
);

const supabaseAnonKey = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_TESTNET_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_MAINNET_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

if (typeof window !== 'undefined') {
  logger.log(`[Supabase] Connected to ${constants.getCurrentNetwork()} database`);
}
