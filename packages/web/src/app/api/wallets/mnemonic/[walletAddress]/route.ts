import type { NextRequest } from 'next/server';

import { z } from 'zod';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { UserRSAService } from '@/lib/user-rsa-service';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { decryptWithRSAPrivateKey } from '@/lib/server-rsa-encryption';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { decryptMnemonicWithFallback } from '@/lib/server-mnemonic-encryption';

const RequestSchema = z.object({
  encryptedAESKey: z.string().min(1, 'Encrypted AES key is required'),
});

/**
 * POST /api/wallets/mnemonic/:walletAddress
 * Get encrypted mnemonic for a wallet (only if platform custody)
 * Returns mnemonic encrypted with client's AES key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

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

    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { encryptedAESKey } = validation.data;

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const custody = await LinkedWalletService.getPlatformCustodyPayload(user.id, walletAddress);

    if (!custody) {
      return NextResponse.json(
        { error: 'Wallet does not have platform custody enabled' },
        { status: 404 }
      );
    }

    const userIdentifier = `${user.id}:${user.email}`;

    const decryptedMnemonic = (
      await decryptMnemonicWithFallback(
        {
          encryptedMnemonic: custody.encryptedMnemonic,
          iv: custody.encryptionIV,
          salt: custody.encryptionSalt,
        },
        {
          supabaseUid: user.id,
          currentEmail: user.email,
          consentEmail: custody.custodyConsentEmail,
        }
      )
    ).mnemonic;

    const rsaPrivateKey = await UserRSAService.getDecryptedPrivateKey(user.id, userIdentifier);

    const aesKeyBase64 = await decryptWithRSAPrivateKey(encryptedAESKey, rsaPrivateKey);
    const aesKeyBuffer = Buffer.from(aesKeyBase64, 'base64');

    const iv = crypto.randomBytes(12);
    const mnemonicBuffer = Buffer.from(decryptedMnemonic, 'utf-8');

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKeyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(mnemonicBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    logger.log('[API /wallets/mnemonic] Mnemonic encrypted for transit:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
    });

    return NextResponse.json({
      encryptedMnemonic: encryptedWithTag.toString('base64'),
      iv: iv.toString('base64'),
    });
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
