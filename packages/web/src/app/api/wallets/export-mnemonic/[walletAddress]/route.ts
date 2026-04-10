import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { decryptMnemonicWithFallback } from '@/lib/server-mnemonic-encryption';
import { exportMnemonicRateLimiter } from '@/server/rateLimiter';

const STEP_UP_MAX_AGE_SECONDS = 5 * 60;

const ParamsSchema = z.object({
  walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
});

function base64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function getJwtIatSeconds(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(base64UrlToString(parts[1]));
    return typeof payload?.iat === 'number' ? payload.iat : null;
  } catch {
    return null;
  }
}

function isStepUpFresh(token: string): boolean {
  const iat = getJwtIatSeconds(token);
  if (!iat) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds - iat <= STEP_UP_MAX_AGE_SECONDS;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = ParamsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request params', details: validation.error.errors },
        { status: 400 }
      );
    }

    if (!token || !isStepUpFresh(token)) {
      return NextResponse.json({ error: 'Step-up authentication required' }, { status: 401 });
    }

    const walletAddress = validation.data.walletAddress;

    const rateKey = `${user.id}:${walletAddress}:export`;
    const { success, reset } = await exportMnemonicRateLimiter.limit(rateKey);
    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many export attempts', retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const custody = await LinkedWalletService.getPlatformCustodyPayload(user.id, walletAddress);
    if (!custody) {
      return NextResponse.json(
        { error: 'Wallet does not have platform custody enabled' },
        { status: 404 }
      );
    }

    const decrypted = await decryptMnemonicWithFallback(
      {
        encryptedMnemonic: custody.encryptedMnemonic,
        iv: custody.encryptionIV,
        salt: custody.encryptionSalt,
      },
      {
        supabaseUid: user.id,
        currentEmail: user.email ?? null,
        consentEmail: custody.custodyConsentEmail,
      }
    );

    logger.log('[API /wallets/export-mnemonic] Exported mnemonic:', {
      userId: user.id.substring(0, 8) + '...',
      walletAddress: walletAddress.substring(0, 8) + '...',
      strategy: decrypted.strategy,
    });

    return NextResponse.json(
      { mnemonic: decrypted.mnemonic },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[API /wallets/export-mnemonic] Error exporting mnemonic:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
