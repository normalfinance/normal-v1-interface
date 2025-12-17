import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { LinkedWalletService } from '@/lib/linked-wallet-service';

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  const token = authHeader.split(' ')[1];

  if (!token) return undefined;

  return token;
}

/**
 * GET /api/wallets/mnemonic/:walletAddress
 * Get encrypted mnemonic data for a wallet (only if platform custody)
 */
export async function GET(request: NextRequest, { params }: { params: { walletAddress: string } }) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletAddress } = params;

    if (!walletAddress || !/^G[A-Z0-9]{55}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const encryptedData = await LinkedWalletService.getEncryptedMnemonic(user.id, walletAddress);

    if (!encryptedData) {
      return NextResponse.json(
        { error: 'Wallet does not have platform custody enabled' },
        { status: 404 }
      );
    }

    logger.log('[API /wallets/mnemonic] Encrypted mnemonic retrieved:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json(encryptedData);
  } catch (error) {
    logger.error('[API /wallets/mnemonic] Error retrieving encrypted mnemonic:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
