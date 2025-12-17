import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { decryptMnemonicServer } from '@/lib/server-mnemonic-encryption';

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  const token = authHeader.split(' ')[1];

  if (!token) return undefined;

  return token;
}

/**
 * GET /api/wallets/mnemonic/:walletAddress
 * Get decrypted mnemonic for a wallet (only if platform custody)
 */
export async function GET(request: NextRequest, { params }: { params: { walletAddress: string } }) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
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

    const userIdentifier = `${user.id}:${user.email}`;
    const decrypted = await decryptMnemonicServer(
      encryptedData.encryptedMnemonic,
      encryptedData.encryptionIV,
      encryptedData.encryptionSalt,
      userIdentifier
    );

    logger.log('[API /wallets/mnemonic] Mnemonic decrypted successfully:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({ mnemonic: decrypted });
  } catch (error) {
    logger.error('[API /wallets/mnemonic] Error retrieving mnemonic:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
