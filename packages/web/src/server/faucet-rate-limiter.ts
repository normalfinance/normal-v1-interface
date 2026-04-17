import { Ratelimit } from '@upstash/ratelimit';

import { redis } from '@/server/rateLimiter';

/** 2 wallet links per rolling 7-day window per user (matches product copy). */
const walletCreationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, '7 d'),
  prefix: 'faucet-wallet',
});

export const faucetRateLimiter = {
  /** Read-only: remaining slots and reset time (for GET /check-limit). */
  check: (userId: string) => walletCreationRatelimit.getRemaining(userId),

  /** Consumes one slot when creating a linked wallet (for POST /link). */
  reserve: async (userId: string) => {
    const result = await walletCreationRatelimit.limit(userId);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  },
};
