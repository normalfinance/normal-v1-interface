import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

const UpdateCustodySchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  custodyChoice: z.enum(['self', 'platform']),
  encryptedMnemonic: z.string().optional(),
  encryptionIV: z.string().optional(),
  encryptionSalt: z.string().optional(),
  custodyConsentEmail: z.string().email().optional(),
});

const RemoveCustodySchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
});

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  const token = authHeader.split(' ')[1];

  if (!token) return undefined;

  return token;
}

/**
 * PATCH /api/wallets/custody
 * Update wallet custody choice
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = UpdateCustodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      walletAddress,
      custodyChoice,
      encryptedMnemonic,
      encryptionIV,
      encryptionSalt,
      custodyConsentEmail,
    } = validation.data;

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (custodyChoice === 'platform') {
      if (!encryptedMnemonic || !encryptionIV || !encryptionSalt || !custodyConsentEmail) {
        return NextResponse.json(
          {
            error:
              'Platform custody requires encryptedMnemonic, encryptionIV, encryptionSalt, and custodyConsentEmail',
          },
          { status: 400 }
        );
      }
    }

    const wallet = await LinkedWalletService.updateWalletCustody(user.id, walletAddress, {
      custodyChoice,
      encryptedMnemonic,
      encryptionIV,
      encryptionSalt,
      custodyConsentEmail,
    });

    logger.log('[API /wallets/custody] Custody updated:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
      custodyChoice,
    });

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        custodyChoice: wallet.custodyChoice,
      },
    });
  } catch (error) {
    logger.error('[API /wallets/custody] Error updating custody:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/wallets/custody
 * Remove platform custody (delete encrypted mnemonic)
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = RemoveCustodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress } = validation.data;

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = await LinkedWalletService.removePlatformCustody(user.id, walletAddress);

    logger.log('[API /wallets/custody] Platform custody removed:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        custodyChoice: wallet.custodyChoice,
      },
    });
  } catch (error) {
    logger.error('[API /wallets/custody] Error removing custody:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
