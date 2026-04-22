import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { faucetRateLimiter } from '@/server/faucet-rate-limiter';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

const LinkWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  walletName: z.string().max(50, 'Wallet name must be 50 characters or less').optional(),
  userId: z.string().uuid().optional(), // Required for admin requests
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
 * Admin can bypass rate limits by using ADMIN_SECRET and providing userId in body
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin bypass (admin_secret as auth token)
    const isAdminRequest = accessToken === process.env.ADMIN_SECRET;
    const isDev = process.env.NODE_ENV === 'development';
    const forceRateLimit = process.env.FORCE_RATE_LIMIT === 'true';

    // Parse and validate request body first (needed for admin userId)
    const body = await request.json();
    const validation = LinkWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, walletName, userId: adminProvidedUserId } = validation.data;

    // const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    // if (isLinked) {
    //   return NextResponse.json({ error: 'Wallet already linked' }, { status: 409 });
    // }

    let userId: string;

    if (isAdminRequest) {
      // Admin request: require userId in body
      if (!adminProvidedUserId) {
        return NextResponse.json(
          { error: 'Admin requests require userId in request body' },
          { status: 400 }
        );
      }
      userId = adminProvidedUserId;
      logger.log('[API /wallets/link] Admin bypass for user:', {
        userId: userId.substring(0, 8) + '...',
      });
    } else {
      // Normal request: authenticate user
      userId = user.id;

      // Check rate limit for non-admin requests
      if (!isDev || forceRateLimit) {
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
              error: 'You can only create 2 wallets per week. Try again next week.',
              reset: rateLimitResult.reset,
            },
            { status: 429 }
          );
        }
      } else if (isDev) {
        logger.log('[API /wallets/link] Dev mode: skipping rate limit', {
          userId: userId.substring(0, 8) + '...',
        });
      }
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
}

/**
 * PATCH /api/wallets/link
 * Update a linked wallet (name, lastUsedAt)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

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
}

/**
 * DELETE /api/wallets/link
 * Unlink a wallet from the authenticated user's account
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}
