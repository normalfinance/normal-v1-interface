import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { autopilotStatusFor } from '@/server/autopilot-status';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const status = await autopilotStatusFor(user.id);
    if (!status.active && (status.reason === 'disabled' || status.reason === 'no-wallet')) {
      return NextResponse.json({ success: true, active: false, reason: status.reason });
    }
    return NextResponse.json({
      success: true,
      active: status.active,
      autopilotUserId: status.autopilotUserId,
      subOrgId: status.subOrgId,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 502 });
  }
});
