import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { rateLimiter } from '@/server/rateLimiter';

const LinkWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  walletName: z.string().max(50, 'Wallet name must be 50 characters or less').optional(),
  custodyChoice: z.enum(['self', 'platform']).optional(),
  encryptedMnemonic: z.string().optional(),
  encryptionIV: z.string().optional(),
  encryptionSalt: z.string().optional(),
  custodyConsentEmail: z.string().email().optional(),
});

const UpdateWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  walletName: z.string().max(50, 'Wallet name must be 50 characters or less').optional(),
});

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;

  const token = authHeader.split(' ')[1];

  if (!token) return undefined;

  return token;
}

/**
 * POST /api/wallets/link
 * Link a wallet to the authenticated user's account
 */
export async function POST(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    // Verify authentication
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin bypass (admin_secret as auth token)
    const isAdminRequest = token === process.env.ADMIN_SECRET;

    // Only check rate limit for non-admin requests
    if (!isAdminRequest) {
      const rateLimitStatus = await rateLimiter.faucet.check(user.id);
      if (rateLimitStatus.remaining === 0) {
        logger.warn('[API /wallets/link] Rate limit exceeded for user:', {
          userId: user.id.substring(0, 8) + '...',
          reset: rateLimitStatus.reset,
        });
        return NextResponse.json(
          {
            error: 'Weekly wallet creation limit exceeded. Try again next week.',
            reset: rateLimitStatus.reset,
          },
          { status: 429 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = LinkWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      walletAddress,
      walletName,
      custodyChoice,
      encryptedMnemonic,
      encryptionIV,
      encryptionSalt,
      custodyConsentEmail,
    } = validation.data;

    // Validate custody data if platform custody is chosen
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

    // Link the wallet
    const linkedWallet = await LinkedWalletService.linkWallet(
      user.id,
      walletAddress,
      walletName,
      custodyChoice
        ? {
            custodyChoice,
            encryptedMnemonic,
            encryptionIV,
            encryptionSalt,
            custodyConsentEmail,
          }
        : undefined
    );

    logger.log('[API /wallets/link] Wallet linked successfully:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json(
      {
        success: true,
        wallet: {
          id: linkedWallet.id,
          walletAddress: linkedWallet.walletAddress,
          walletName: linkedWallet.walletName,
          createdAt: linkedWallet.createdAt,
          lastUsedAt: linkedWallet.lastUsedAt,
          custodyChoice: linkedWallet.custodyChoice,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[API /wallets/link] Error linking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/wallets/link
 * Update a linked wallet (name, lastUsedAt)
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    // Verify authentication
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, walletName } = validation.data;

    // Check if wallet is linked to this user
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Update wallet name if provided
    if (walletName !== undefined) {
      await LinkedWalletService.updateWalletName(user.id, walletAddress, walletName);
    }

    // Always update lastUsedAt
    await LinkedWalletService.updateLastUsed(user.id, walletAddress);

    logger.log('[API /wallets/link] Wallet updated successfully:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[API /wallets/link] Error updating wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/wallets/link
 * Unlink a wallet from the authenticated user's account
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    // Verify authentication
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get wallet address from query params
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Check if wallet is linked to this user
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Unlink the wallet
    await LinkedWalletService.unlinkWallet(user.id, walletAddress);

    logger.log('[API /wallets/link] Wallet unlinked successfully:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[API /wallets/link] Error unlinking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
