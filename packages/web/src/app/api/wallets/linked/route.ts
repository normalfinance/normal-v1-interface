import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { LinkedWalletService } from '@/lib/linked-wallet-service';

/**
 * GET /api/wallets/linked
 * Get all wallets linked to the authenticated user's account
 */
export async function GET() {
  try {
    // Verify authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}


