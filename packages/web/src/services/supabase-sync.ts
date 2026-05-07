import { createClient } from '@supabase/supabase-js';
import type { UserRow } from '@/lib/dune/tables';

const SUPABASE_URL = process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NETWORK = 'mainnet';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function fetchSupabaseUsers(): Promise<UserRow[]> {
  const admin = getAdminClient();
  const rows: UserRow[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);

    for (const user of data.users) {
      rows.push({
        user_id: user.id,
        email: user.email ?? '',
        created_at: user.created_at,
        network: NETWORK,
      });
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return rows;
}
