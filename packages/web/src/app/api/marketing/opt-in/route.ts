import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { cioSetMarketingOptIn } from '@/lib/customerio';

export const dynamic = 'force-dynamic';

// POST /api/marketing/opt-in  { optIn: boolean }
// Syncs marketing consent to Customer.io server-side (keeps API keys off the client).
// The caller is also responsible for updating supabase.auth.updateUser({ data: { marketing_opt_in } })
// so the preference is readable from the session without an extra fetch.
export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const optIn: boolean = Boolean(body.optIn);

    await cioSetMarketingOptIn(user.id, user.email ?? '', optIn);

    return NextResponse.json({ success: true, optIn });
  } catch (err: any) {
    console.error('[marketing/opt-in]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
