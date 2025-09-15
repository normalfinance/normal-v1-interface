import { constants } from '@normalfinance/utils';
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_MAINNET_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
);

const supabaseAnonKey = constants.getNetworkConfig(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_SUPABASE_MAINNET_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== 'undefined') {
  console.log(`[Supabase] Connected to ${constants.getCurrentNetwork()} database`);
}
