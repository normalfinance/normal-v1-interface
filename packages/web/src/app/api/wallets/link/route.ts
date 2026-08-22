import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { faucetRateLimiter } from '@/server/faucet-rate-limiter';
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
 * Link a wallet to the authenticated user's account.
 *
 * #36 (removed 2026-08-12): an ADMIN_SECRET rate-limit bypass used to live
 * here — provably unreachable, because withAuth rejects any bearer token
 * that is not a valid Supabase session BEFORE the comparison could run.
 * Dead security code invites someone to "fix" it into a live backdoor, so
 * it is gone rather than documented.
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const isTestnet = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== 'mainnet';
    const forceRateLimit = process.env.FORCE_RATE_LIMIT === 'true';

    const body = await request.json();
    const validation = LinkWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, walletName } = validation.data;
    const userId = user.id;

    // Rate limit (skipped on dev/testnet unless FORCE_RATE_LIMIT=true)
    if ((!isDev && !isTestnet) || forceRateLimit) {
      const rateLimitResult = await faucetRateLimiter.reserve(userId);
      if (rateLimitResult.degraded) {
        logger.warn('[API /wallets/link] Rate limiter unavailable, allowing wallet creation:', {
          userId: userId.substring(0, 8) + '...',
        });
      }
      if (!rateLimitResult.success) {
        logger.warn('[API /wallets/link] Rate limit exceeded for user:', {
          userId: userId.substring(0, 8) + '...',
          reset: rateLimitResult.reset,
        });
        return NextResponse.json(
          {
            // "Try again tomorrow" is wrong for a ROLLING window — a slot
            // frees 24h after the oldest use, often within hours. The client
            // appends the real wait from `reset`.
            error: 'You can only add 3 wallets per day.',
            reset: rateLimitResult.reset,
          },
          { status: 429 }
        );
      }
    } else {
      logger.log('[API /wallets/link] Dev/testnet mode: skipping rate limit', {
        userId: userId.substring(0, 8) + '...',
      });
    }

    // Link the wallet
    const linkedWallet = await LinkedWalletService.linkWallet(userId, walletAddress, walletName);

    logger.log('[API /wallets/link] Wallet linked successfully:', {
      userId: userId.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    // Create or find user in the users table for referral tracking
    // try {
    //   await ReferralService.findOrCreateUser(walletAddress);
    //   logger.log('[API /wallets/link] User record ensured for wallet:', {
    //     walletAddress: walletAddress.substring(0, 8) + '...',
    //   });
    // } catch (userError) {
    //   // Log but don't fail the wallet linking - user creation is secondary
    //   logger.warn('[API /wallets/link] Failed to create user record:', userError);
    // }

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
    console.log('[API /wallets/link] Error linking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * PATCH /api/wallets/link
 * Update a linked wallet (name, lastUsedAt)
 */
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
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

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    console.log('[API /wallets/link] Error updating wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/wallets/link
 * Unlink a wallet from the authenticated user's account
 */
export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Get wallet address from query params
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // #32 chunk 2: the Turnkey (Normal) wallet's Stellar address can never be
    // unlinked — it holds the user's funds and the link row backs the
    // ownership checks CCTP/swap logging relies on. Observed live 2026-08-15:
    // the settings page happily offered to unlink the wallet holding all of
    // the user's money.
    const tk = await prisma.turnkeyWallet.findUnique({
      where: { supabaseUid: user.id },
      select: { stellarAddress: true },
    });
    if (tk?.stellarAddress && tk.stellarAddress === walletAddress) {
      return NextResponse.json(
        { error: 'Your Normal wallet cannot be unlinked from your account.' },
        { status: 400 }
      );
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
    console.log('[API /wallets/link] Error unlinking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
