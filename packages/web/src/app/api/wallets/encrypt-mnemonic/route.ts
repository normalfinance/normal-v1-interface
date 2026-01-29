import type { NextRequest } from 'next/server';

import { z } from 'zod';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { UserRSAService } from '@/lib/user-rsa-service';
import { decryptWithRSAPrivateKey } from '@/lib/server-rsa-encryption';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { encryptMnemonicServer } from '@/lib/server-mnemonic-encryption';

const EncryptSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  encryptedMnemonic: z.string().min(1, 'Encrypted mnemonic is required'),
  encryptedAESKey: z.string().min(1, 'Encrypted AES key is required'),
  iv: z.string().min(1, 'IV is required'),
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

    const { walletAddress, encryptedMnemonic, encryptedAESKey, iv } = validation.data;

    const userIdentifier = `${user.id}:${user.email}`;

    const rsaPrivateKey = await UserRSAService.getDecryptedPrivateKey(user.id, userIdentifier);

    const aesKeyBase64 = await decryptWithRSAPrivateKey(encryptedAESKey, rsaPrivateKey);

    const encryptedMnemonicBuffer = Buffer.from(encryptedMnemonic, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const aesKeyBuffer = Buffer.from(aesKeyBase64, 'base64');

    const authTagLength = 16;
    const encryptedData = encryptedMnemonicBuffer.subarray(
      0,
      encryptedMnemonicBuffer.length - authTagLength
    );
    const authTag = encryptedMnemonicBuffer.subarray(
      encryptedMnemonicBuffer.length - authTagLength
    );

    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKeyBuffer, ivBuffer);
    decipher.setAuthTag(authTag);

    const decryptedMnemonic = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]).toString('utf-8');

    const encrypted = await encryptMnemonicServer(decryptedMnemonic, userIdentifier);

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
