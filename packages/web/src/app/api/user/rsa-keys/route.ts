import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { UserRSAService } from '@/lib/user-rsa-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import {
  encryptRSAPrivateKey,
  decryptClientEncryptedRSAPrivateKey,
} from '@/lib/server-rsa-encryption';
import { getAccessToken } from '@/utils/http';

const StoreRSASchema = z.object({
  publicKey: z.string().min(1, 'Public key is required'),
  encryptedPrivateKey: z.string().min(1, 'Encrypted private key is required'),
  iv: z.string().min(1, 'IV is required'),
  salt: z.string().min(1, 'Salt is required'),
});

export async function GET(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rsaKeys = await UserRSAService.getUserRSAKeys(user.id);

    if (!rsaKeys) {
      return NextResponse.json({ hasKeys: false });
    }

    return NextResponse.json({
      hasKeys: true,
      publicKey: rsaKeys.publicKey,
    });
  } catch (error) {
    logger.error('[API /user/rsa-keys] Error fetching RSA keys:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = StoreRSASchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { publicKey, encryptedPrivateKey, iv, salt } = validation.data;

    const clientSecret = token.substring(0, 32);
    const decryptedPrivateKey = await decryptClientEncryptedRSAPrivateKey(
      encryptedPrivateKey,
      iv,
      salt,
      clientSecret,
      user.id
    );

    const userIdentifier = `${user.id}:${user.email}`;
    const reEncrypted = await encryptRSAPrivateKey(decryptedPrivateKey, userIdentifier);

    await UserRSAService.createUserRSAKeys(
      user.id,
      publicKey,
      reEncrypted.encryptedPrivateKey,
      reEncrypted.iv,
      reEncrypted.salt
    );

    logger.log('[API /user/rsa-keys] RSA keys stored successfully:', {
      userId: user.id.substring(0, 8) + '...',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[API /user/rsa-keys] Error storing RSA keys:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
