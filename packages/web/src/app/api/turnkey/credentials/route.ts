import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { turnkey } from '@/lib/turnkey/server';

// The WebAuthn credential IDs registered to THIS user's Turnkey sub-org.
//
// Why it exists (live 2026-08-22): a passkey prompt with no allowCredentials
// offers EVERY passkey on the device. On a device with more than one account
// — a tester, a shared laptop, someone who signed up twice — picking the
// wrong one fails deep inside Turnkey with "credential ID could not be found
// in organization" (CREDENTIAL_NOT_FOUND), long after the biometric. Passing
// these ids means the browser only ever offers the right passkey, so that
// error becomes unreachable instead of merely explained.
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const row = await prisma.turnkeyWallet.findFirst({
      where: { supabaseUid: user.id },
      select: { subOrgId: true },
    });
    if (!row?.subOrgId) return NextResponse.json({ success: true, credentialIds: [] });

    const client = turnkey.apiClient();
    const { users } = await client.getUsers({ organizationId: row.subOrgId });
    const credentialIds = users
      .flatMap((u) => u.authenticators ?? [])
      .map((a) => a.credentialId)
      .filter(Boolean);

    return NextResponse.json({ success: true, credentialIds, subOrgId: row.subOrgId });
  } catch (e: any) {
    // Never block a ceremony on this: an empty list just means "no
    // restriction", i.e. exactly today's behaviour.
    return NextResponse.json({ success: false, credentialIds: [], error: String(e?.message ?? e) });
  }
});
