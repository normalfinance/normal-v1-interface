import type { NextRequest } from 'next/server';
import type { PasskeyAttestation } from '@/lib/turnkey/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { XLM_ACCOUNT } from '@/lib/turnkey/account-specs';
import { turnkey, getSubOrgRootUserId, buildPasskeyRootUser } from '@/lib/turnkey/server';

// ---------------------------------------------------------------------------
// POST /api/turnkey/import-init
// Prepares a wallet (mnemonic) import for the authenticated user.
//
// - If the user has no Turnkey sub-org yet, the body must include a passkey
//   { challenge, attestation } and we create a sub-org WITHOUT a wallet —
//   the wallet arrives via the import itself.
// - Returns { subOrgId, userId, accounts }. The import activities themselves
//   (INIT_IMPORT_WALLET / IMPORT_WALLET) are stamped client-side by the
//   user's passkey — Turnkey rejects parent-org keys targeting a sub-org
//   (ORGANIZATION_MISMATCH), and this keeps the mnemonic flow end-to-end
//   client-side anyway.
// ---------------------------------------------------------------------------
export const POST = withAuth(async (request: NextRequest, { user }) => {
  let body: { challenge?: string; attestation?: PasskeyAttestation } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine when a sub-org already exists
  }

  try {
    const existing = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });

    let subOrgId: string;
    let turnkeyUserId: string | null = null;

    if (existing) {
      subOrgId = existing.subOrgId;
      turnkeyUserId = await getSubOrgRootUserId(subOrgId);
    } else {
      if (!body.challenge || !body.attestation?.credentialId) {
        return NextResponse.json(
          { error: 'Passkey required', code: 'PASSKEY_REQUIRED' },
          { status: 400 }
        );
      }

      const result = await turnkey.apiClient().createSubOrganization({
        // Unique by construction. The name is a dashboard label — nothing
        // parses it — but the uid prefix alone REPEATS when an account is
        // re-provisioned (support wipes the turnkey_wallets row so a user whose
        // passkey became unusable can start over, and the uid is unchanged).
        // A name we cannot guarantee is accepted twice would fail exactly the
        // recovery it is needed for, so the suffix removes the question.
        subOrganizationName: `normal-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
        rootQuorumThreshold: 1,
        rootUsers: [buildPasskeyRootUser(user, body.challenge, body.attestation)],
        // no `wallet` — the user's own mnemonic arrives via the import
      });

      subOrgId = result.subOrganizationId;
      turnkeyUserId = result.rootUserIds?.[0] ?? (await getSubOrgRootUserId(subOrgId));

      // Persist the sub-org now (walletId filled in after the import) so a
      // retry after an abandoned attempt reuses this sub-org instead of
      // creating an orphan.
      await prisma.turnkeyWallet.create({
        data: { supabaseUid: user.id, subOrgId, walletId: '' },
      });

      logger.log('[turnkey/import-init] Created sub-org for import', {
        uid: user.id.slice(0, 8),
      });
    }

    if (!turnkeyUserId) {
      return NextResponse.json({ error: 'Could not resolve Turnkey user' }, { status: 500 });
    }

    return NextResponse.json({
      subOrgId,
      userId: turnkeyUserId,
      // Lazily provisioned — the user is importing their STELLAR wallet, so
      // only the XLM account is derived. Other chains are added on demand.
      accounts: XLM_ACCOUNT,
    });
  } catch (error) {
    logger.error('[turnkey/import-init] Error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to start wallet import: ${detail}` },
      { status: 500 }
    );
  }
});
