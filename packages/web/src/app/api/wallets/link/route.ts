import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { LinkedWalletService } from '@/lib/linked-wallet-service';

const LinkWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  walletName: z.string().max(50, 'Wallet name must be 50 characters or less').optional(),
});

const UpdateWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  walletName: z.string().max(50, 'Wallet name must be 50 characters or less').optional(),
});

/**
 * POST /api/wallets/link
 * Link a wallet to the authenticated user's account
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { walletAddress, walletName } = validation.data;

    // Link the wallet
    const linkedWallet = await LinkedWalletService.linkWallet(user.id, walletAddress, walletName);

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
    // Verify authentication
    const user = await getAuthenticatedUser();
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
    // Verify authentication
    const user = await getAuthenticatedUser();
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


