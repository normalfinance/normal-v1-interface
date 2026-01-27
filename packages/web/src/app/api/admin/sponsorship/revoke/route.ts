import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { SponsorService } from '@/lib/sponsor-service';

const RevokeSchema = z.object({
  walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  reason: z.string().min(1, 'Reason is required'),
  adminSecret: z.string().min(1, 'Admin secret is required'),
});

/**
 * POST /api/admin/sponsorship/revoke
 * Revoke sponsorship for an abusive account
 * This returns the locked reserves to the sponsor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RevokeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, reason, adminSecret } = validation.data;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) {
      logger.error('[API /admin/sponsorship/revoke] ADMIN_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (adminSecret !== expectedSecret) {
      logger.warn('[API /admin/sponsorship/revoke] Unauthorized revocation attempt:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const txHash = await SponsorService.revokeSponsorship(walletAddress, reason);

    logger.log('[API /admin/sponsorship/revoke] Sponsorship revoked:', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      reason,
      txHash,
    });

    return NextResponse.json(
      {
        success: true,
        txHash,
        message: `Sponsorship revoked for ${walletAddress.substring(0, 8)}...`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[API /admin/sponsorship/revoke] Error revoking sponsorship:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Sponsorship record not found' }, { status: 404 });
    }

    if (error.message?.includes('already been revoked')) {
      return NextResponse.json({ error: 'Sponsorship has already been revoked' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to revoke sponsorship' },
      { status: 500 }
    );
  }
}
