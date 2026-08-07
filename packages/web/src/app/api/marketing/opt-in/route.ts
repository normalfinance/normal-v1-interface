import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { cioSetMarketingOptIn } from '@/lib/customerio';

export const dynamic = 'force-dynamic';

// GET /api/marketing/opt-in — returns current opt-in status from user metadata
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const optIn: boolean = Boolean(user.user_metadata?.marketing_opt_in);
    return NextResponse.json({ success: true, optIn });
  } catch (err: any) {
    console.error('[marketing/opt-in GET]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
});

// POST /api/marketing/opt-in  { optIn: boolean }
// Syncs marketing consent to Customer.io server-side (keeps API keys off the client).
// The caller is also responsible for updating supabase.auth.updateUser({ data: { marketing_opt_in } })
// so the preference is readable from the session without an extra fetch.
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const optIn: boolean = Boolean(body.optIn);

    await cioSetMarketingOptIn(user.id, user.email ?? '', optIn);

    return NextResponse.json({ success: true, optIn });
  } catch (err: any) {
    console.error('[marketing/opt-in POST]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
});
