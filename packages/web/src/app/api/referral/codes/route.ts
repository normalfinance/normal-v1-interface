import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { ReferralService } from '@/lib/referral-service';
import { getClientIP, getAccessToken } from '@/utils/http';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

const CreateReferralSchema = z.object({
  referrerWalletAddress: z.string().min(1, 'Referrer wallet address is required'),
  customCode: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
});

const GetReferralSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
});

async function createReferralHandler(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateReferralSchema.safeParse(body);

    if (!validation.success) {
      await logWithConfig('warn', 'Referral codes POST API called with invalid request body', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { referrerWalletAddress, customCode } = validation.data;

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-codes');
    const apiConfig = await getApiConfig('referral-codes');

    // Get client IP address
    const ip = getClientIP(request);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(referrerWalletAddress, ip);

    await logWithConfig('info', 'Referral codes create rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: referrerWalletAddress.substring(0, 8) + '...',
      effectiveLimit,
      customCode,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral codes create API', {
        referrerWalletAddress,
        customCode,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const referral = await ReferralService.createReferralCode(referrerWalletAddress, customCode);

    await logWithConfig('info', 'Referral code created successfully', {
      referrerWalletAddress: referrerWalletAddress.substring(0, 8) + '...',
      customCode,
    });

    return NextResponse.json(
      {
        referral,
        config: {
          timeout: apiConfig.timeout,
          rateLimitRemaining: remaining,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await logWithConfig('error', 'Error creating referral code', { error });

    if (error instanceof Error && error.message === 'Referral code already exists') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getReferralHandler(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    const validation = GetReferralSchema.safeParse({ code });
    if (!validation.success) {
      await logWithConfig('warn', 'Referral codes GET API called with invalid parameters', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    const apiConfig = await getApiConfig('referral-codes');

    // Get client IP address
    const ip = getClientIP(request);

    const { success, limit, remaining, reset } = await rateLimiter.limit(
      `referral-lookup-${code}`,
      ip
    );

    await logWithConfig('info', 'Referral codes GET rate limit check', {
      success,
      limit,
      remaining,
      reset,
      code,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral codes GET API', { code });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const referral = await ReferralService.getReferralByCode(validation.data.code);

    if (!referral) {
      await logWithConfig('warn', 'Referral code not found', { code: validation.data.code });
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    await logWithConfig('info', 'Referral code retrieved successfully', {
      code: validation.data.code,
    });

    return NextResponse.json({
      referral,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching referral code', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = createEdgeConfigHandler(createReferralHandler, 'referral-codes');
export const GET = createEdgeConfigHandler(getReferralHandler, 'referral-codes');
