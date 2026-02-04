import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { ReferralService } from '@/lib/referral-service';
import { getClientIP, getAccessToken } from '@/utils/http';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

const RecordActionSchema = z.object({
  userWalletAddress: z.string().min(1, 'User wallet address is required'),
  referralCode: z.string().min(1, 'Referral code is required'),
  action: z.string().min(1, 'Action is required'),
  metadata: z
    .object({
      amount: z.string().optional(),
      tokenSymbol: z.string().optional(),
    })
    .optional(),
});

const GetActionsSchema = z.object({
  userWalletAddress: z.string().min(1, 'User wallet address is required'),
  referralCode: z.string().optional(),
});

async function recordActionHandler(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = RecordActionSchema.safeParse(body);

    if (!validation.success) {
      await logWithConfig('warn', 'Referral actions API called with invalid request body', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userWalletAddress, referralCode, action, metadata } = validation.data;

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-actions');
    const apiConfig = await getApiConfig('referral-actions');

    // Get client IP address
    const ip = getClientIP(request);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(userWalletAddress, ip);

    await logWithConfig('info', 'Referral actions rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: userWalletAddress.substring(0, 8) + '...',
      effectiveLimit,
      action,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral actions API', {
        userWalletAddress,
        action,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!ReferralService.isValidAction(action)) {
      return NextResponse.json(
        {
          error: 'Invalid action type',
          validActions: ReferralService.getValidActions(),
          enabledActions: ReferralService.getEnabledActions(),
        },
        { status: 400 }
      );
    }

    if (!ReferralService.isEnabledAction(action)) {
      return NextResponse.json(
        {
          error: 'Action is not enabled',
          enabledActions: ReferralService.getEnabledActions(),
        },
        { status: 400 }
      );
    }

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(user.id, userWalletAddress);
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const actionRecord = await ReferralService.recordAction(
      userWalletAddress,
      referralCode,
      action,
      metadata
    );

    await logWithConfig('info', 'Referral action recorded successfully', {
      walletAddress: userWalletAddress.substring(0, 8) + '...',
      action,
      referralCode,
    });

    return NextResponse.json(
      {
        action: actionRecord,
        message: 'Action recorded successfully',
        config: {
          timeout: apiConfig.timeout,
          rateLimitRemaining: remaining,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await logWithConfig('error', 'Error recording referral action', { error });

    if (error instanceof Error) {
      const errorMessages = [
        'Referral not found',
        'Action already recorded for this referral',
        'Action is not enabled',
        'Invalid metadata',
      ];

      if (
        error.message.includes('Invalid action') ||
        error.message.includes('not enabled') ||
        error.message.includes('Invalid metadata')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (errorMessages.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getActionsHandler(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const referralCode = searchParams.get('referralCode');

    const validation = GetActionsSchema.safeParse({
      userWalletAddress,
      referralCode: referralCode || undefined,
    });

    if (!validation.success) {
      await logWithConfig('warn', 'Referral actions GET API called with invalid parameters', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    // const rateLimitConfig = await getRateLimitConfig('referral-actions');
    const apiConfig = await getApiConfig('referral-actions');

    // Get client IP address
    const ip = getClientIP(request);

    const { success, limit, remaining, reset } = await rateLimiter.limit(
      validation.data.userWalletAddress,
      ip
    );

    await logWithConfig('info', 'Referral actions GET rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: validation.data.userWalletAddress.substring(0, 8) + '...',
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral actions GET API', {
        userWalletAddress: validation.data.userWalletAddress,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(
    //   user.id,
    //   validation.data.userWalletAddress
    // );
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const actions = await ReferralService.getUserActions(
      validation.data.userWalletAddress,
      validation.data.referralCode
    );

    await logWithConfig('info', 'Referral actions retrieved successfully', {
      walletAddress: validation.data.userWalletAddress.substring(0, 8) + '...',
      actionsCount: actions.length,
    });

    return NextResponse.json({
      actions,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching referral actions', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = createEdgeConfigHandler(recordActionHandler, 'referral-actions');
export const GET = createEdgeConfigHandler(getActionsHandler, 'referral-actions');
