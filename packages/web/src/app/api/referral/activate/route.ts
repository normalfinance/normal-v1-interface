import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { ReferralService } from '@/lib/referral-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

const ActivateReferralSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
  refereeWalletAddress: z.string().min(1, 'Referee wallet address is required'),
});

async function activateReferralHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ActivateReferralSchema.safeParse(body);

    if (!validation.success) {
      await logWithConfig('warn', 'Referral activate API called with invalid request body', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { code, refereeWalletAddress } = validation.data;

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-activate');
    const apiConfig = await getApiConfig('referral-activate');

    // Get client IP address
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0] ||
      request.ip;

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(refereeWalletAddress, ip);

    await logWithConfig('info', 'Referral activate rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: refereeWalletAddress.substring(0, 8) + '...',
      effectiveLimit,
      code,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral activate API', {
        refereeWalletAddress,
        code,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const referral = await ReferralService.activateReferral(code, refereeWalletAddress);

    await logWithConfig('info', 'Referral activated successfully', {
      refereeWalletAddress: refereeWalletAddress.substring(0, 8) + '...',
      code,
    });

    return NextResponse.json({
      referral,
      message: 'Referral activated successfully',
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error activating referral', { error });

    if (error instanceof Error) {
      const errorMessages = [
        'Referral code not found',
        'Referral code already used',
        'Referral code is inactive',
        'Cannot use your own referral code',
      ];

      if (errorMessages.includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = createEdgeConfigHandler(activateReferralHandler, 'referral-activate');
