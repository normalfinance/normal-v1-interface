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
//
// TRANSPORTS matter as much as the ids (live 2026-08-22): pinning an id with
// no transport hint makes Chrome guess where that credential lives, and it
// guesses "plug in a USB security key" — a dead end for a passkey held in
// Google Password Manager on the user's PHONE (transports hybrid+internal).
// Turnkey stores what the authenticator reported at registration, so we pass
// it straight through and Chrome offers the phone/QR flow instead.
export const dynamic = 'force-dynamic';

/** Turnkey's enum → the strings WebAuthn's allowCredentials expects. */
const TRANSPORTS: Record<string, string> = {
  AUTHENTICATOR_TRANSPORT_BLE: 'ble',
  AUTHENTICATOR_TRANSPORT_INTERNAL: 'internal',
  AUTHENTICATOR_TRANSPORT_NFC: 'nfc',
  AUTHENTICATOR_TRANSPORT_USB: 'usb',
  AUTHENTICATOR_TRANSPORT_HYBRID: 'hybrid',
};

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const row = await prisma.turnkeyWallet.findFirst({
      where: { supabaseUid: user.id },
      select: { subOrgId: true },
    });
    if (!row?.subOrgId) return NextResponse.json({ success: true, credentialIds: [] });

    const client = turnkey.apiClient();
    const { users } = await client.getUsers({ organizationId: row.subOrgId });
    const authenticators = users.flatMap((u) => u.authenticators ?? []);
    const credentials = authenticators
      .filter((a) => a.credentialId)
      .map((a) => ({
        id: a.credentialId,
        transports: (a.transports ?? [])
          .map((t) => TRANSPORTS[t])
          .filter((t): t is string => Boolean(t)),
      }));

    return NextResponse.json({
      success: true,
      credentials,
      // Kept so a cached older client still gets the id restriction.
      credentialIds: credentials.map((c) => c.id),
      subOrgId: row.subOrgId,
    });
  } catch (e: any) {
    // Never block a ceremony on this: an empty list just means "no
    // restriction", i.e. exactly today's behaviour.
    return NextResponse.json({
      success: false,
      credentials: [],
      credentialIds: [],
      error: String(e?.message ?? e),
    });
  }
});
