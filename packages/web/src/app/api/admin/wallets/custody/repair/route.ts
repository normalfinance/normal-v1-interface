import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import {
  decryptMnemonicServer,
  decryptMnemonicServerV2,
  encryptMnemonicServerV2,
  type MnemonicDecryptStrategy,
} from '@/lib/server-mnemonic-encryption';

const RepairSchema = z.object({
  walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  adminSecret: z.string().min(1, 'Admin secret is required'),
  oldEmail: z.string().email().optional(),
});

type RepairDecryptStrategy = MnemonicDecryptStrategy | 'v1_oldEmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RepairSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, adminSecret, oldEmail } = validation.data;

    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) {
      logger.error('[API /admin/wallets/custody/repair] ADMIN_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (adminSecret !== expectedSecret) {
      logger.warn('[API /admin/wallets/custody/repair] Unauthorized repair attempt:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallets = await prisma.linkedWallet.findMany({
      where: { walletAddress },
      select: {
        id: true,
        supabaseUid: true,
        custodyChoice: true,
        encryptedMnemonic: true,
        encryptionIV: true,
        encryptionSalt: true,
        custodyConsentEmail: true,
      },
    });

    if (wallets.length === 0) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallets.length > 1) {
      return NextResponse.json(
        { error: 'Multiple linked wallets found for this address', count: wallets.length },
        { status: 409 }
      );
    }

    const wallet = wallets[0];

    if (wallet.custodyChoice !== 'platform') {
      return NextResponse.json(
        { error: 'Wallet does not have platform custody enabled' },
        { status: 400 }
      );
    }

    if (!wallet.encryptedMnemonic || !wallet.encryptionIV || !wallet.encryptionSalt) {
      return NextResponse.json({ error: 'Missing custody encryption fields' }, { status: 400 });
    }

    let mnemonic: string | null = null;
    let strategy: RepairDecryptStrategy | null = null;
    const errors: string[] = [];

    try {
      mnemonic = await decryptMnemonicServerV2(
        wallet.encryptedMnemonic,
        wallet.encryptionIV,
        wallet.encryptionSalt,
        wallet.supabaseUid
      );
      strategy = 'v2_supabaseUid';
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'v2 decrypt failed');
    }

    if (!mnemonic && wallet.custodyConsentEmail) {
      try {
        mnemonic = await decryptMnemonicServer(
          wallet.encryptedMnemonic,
          wallet.encryptionIV,
          wallet.encryptionSalt,
          `${wallet.supabaseUid}:${wallet.custodyConsentEmail}`
        );
        strategy = 'v1_consentEmail';
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'v1 consentEmail decrypt failed');
      }
    }

    if (!mnemonic && oldEmail) {
      try {
        mnemonic = await decryptMnemonicServer(
          wallet.encryptedMnemonic,
          wallet.encryptionIV,
          wallet.encryptionSalt,
          `${wallet.supabaseUid}:${oldEmail}`
        );
        strategy = 'v1_oldEmail';
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'v1 oldEmail decrypt failed');
      }
    }

    if (!mnemonic || !strategy) {
      return NextResponse.json(
        { error: `Could not decrypt mnemonic (${errors.length} attempts)`, details: errors },
        { status: 422 }
      );
    }

    const reEncrypted = await encryptMnemonicServerV2(mnemonic, wallet.supabaseUid);

    await prisma.linkedWallet.update({
      where: { id: wallet.id },
      data: {
        encryptedMnemonic: reEncrypted.encryptedMnemonic,
        encryptionIV: reEncrypted.iv,
        encryptionSalt: reEncrypted.salt,
      },
    });

    logger.log('[API /admin/wallets/custody/repair] Custody repaired:', {
      supabaseUid: wallet.supabaseUid.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
      strategy,
    });

    return NextResponse.json(
      {
        success: true,
        walletAddress,
        strategy,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[API /admin/wallets/custody/repair] Error repairing custody:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to repair custody' },
      { status: 500 }
    );
  }
}
