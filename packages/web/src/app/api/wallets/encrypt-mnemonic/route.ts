import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { encryptMnemonicServer } from '@/lib/server-mnemonic-encryption';

const EncryptSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  mnemonic: z.string().min(1, 'Mnemonic is required'),
});

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  const token = authHeader.split(' ')[1];

  if (!token) return undefined;

  return token;
}

export async function POST(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = EncryptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, mnemonic } = validation.data;

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const userIdentifier = `${user.id}:${user.email}`;
    const encrypted = await encryptMnemonicServer(mnemonic, userIdentifier);

    logger.log('[API /encrypt-mnemonic] Mnemonic encrypted successfully:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({
      encryptedMnemonic: encrypted.encryptedMnemonic,
      encryptionIV: encrypted.iv,
      encryptionSalt: encrypted.salt,
    });
  } catch (error) {
    logger.error('[API /encrypt-mnemonic] Error encrypting mnemonic:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
