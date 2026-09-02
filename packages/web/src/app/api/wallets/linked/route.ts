import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { LinkedWalletService } from '@/lib/linked-wallet-service';

/**
 * GET /api/wallets/linked
 * Get all wallets linked to the authenticated user's account
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Authenticate

    // Get linked wallets
    const wallets = await LinkedWalletService.getLinkedWallets(user.id);

    logger.log('[API /wallets/linked] Retrieved linked wallets:', {
      userId: user.id.substring(0, 8) + '...',
      count: wallets.length,
    });

    return NextResponse.json({
      wallets: wallets.map((wallet) => ({
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      })),
    });
  } catch (error) {
    logger.error('[API /wallets/linked] Error getting linked wallets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
