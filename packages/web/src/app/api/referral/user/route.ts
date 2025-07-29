import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { ReferralService } from '@/lib/referral-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

const GetUserSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

const CreateUserSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

async function getUserHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    const validation = GetUserSchema.safeParse({ walletAddress });
    if (!validation.success) {
      await logWithConfig('warn', 'Referral user GET API called with invalid parameters', { errors: validation.error.errors });
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-user');
    const apiConfig = await getApiConfig('referral-user');

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

    const { success, limit, remaining, reset } = await rateLimiter.limit(validation.data.walletAddress, ip);
    
    await logWithConfig('info', 'Referral user GET rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral user GET API', { walletAddress: validation.data.walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const user = await ReferralService.getUserByWallet(validation.data.walletAddress);

    if (!user) {
      await logWithConfig('warn', 'Referral user not found', { walletAddress: validation.data.walletAddress.substring(0, 8) + '...' });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await logWithConfig('info', 'Referral user retrieved successfully', {
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...'
    });

    return NextResponse.json({ 
      user,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      }
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching referral user', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createUserHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      await logWithConfig('warn', 'Referral user POST API called with invalid request body', { errors: validation.error.errors });
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-user');
    const apiConfig = await getApiConfig('referral-user');

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

    const { success, limit, remaining, reset } = await rateLimiter.limit(validation.data.walletAddress, ip);
    
    await logWithConfig('info', 'Referral user POST rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral user POST API', { walletAddress: validation.data.walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const user = await ReferralService.findOrCreateUser(validation.data.walletAddress);

    await logWithConfig('info', 'Referral user created/found successfully', {
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...'
    });

    return NextResponse.json({ 
      user,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      }
    }, { status: 201 });
  } catch (error) {
    await logWithConfig('error', 'Error creating referral user', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = createEdgeConfigHandler(getUserHandler, 'referral-user');
export const POST = createEdgeConfigHandler(createUserHandler, 'referral-user');
