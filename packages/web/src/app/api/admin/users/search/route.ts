import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';

const SearchSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address')
    .optional(),
  adminSecret: z.string().min(1, 'Admin secret is required'),
});

/**
 * POST /api/admin/users/search
 * Search for a user by wallet address
 * Returns user ID and their linked wallets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = SearchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, adminSecret } = validation.data;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) {
      logger.error('[API /admin/users/search] ADMIN_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (adminSecret !== expectedSecret) {
      logger.warn('[API /admin/users/search] Unauthorized search attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required for search' }, { status: 400 });
    }

    // Search by wallet address
    const linkedWallet = await prisma.linkedWallet.findFirst({
      where: { walletAddress },
      select: {
        supabaseUid: true,
        walletAddress: true,
        walletName: true,
        createdAt: true,
        custodyChoice: true,
      },
    });

    if (!linkedWallet) {
      return NextResponse.json(
        { error: 'No user found with this wallet address' },
        { status: 404 }
      );
    }

    // Get all wallets for this user
    const allWallets = await prisma.linkedWallet.findMany({
      where: { supabaseUid: linkedWallet.supabaseUid },
      select: {
        walletAddress: true,
        walletName: true,
        createdAt: true,
        custodyChoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.log('[API /admin/users/search] User found:', {
      userId: linkedWallet.supabaseUid.substring(0, 8) + '...',
      walletCount: allWallets.length,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: linkedWallet.supabaseUid,
          wallets: allWallets,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[API /admin/users/search] Error searching for user:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to search for user' },
      { status: 500 }
    );
  }
}
