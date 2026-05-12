import { logger } from '@normalfinance/utils';
import { Ratelimit } from '@upstash/ratelimit';
import { redis, getUpstashConfigDiagnostics } from '@/server/rateLimiter';

/** 3 wallet links per rolling 24-hour window per user. */
const walletCreationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 d'),
  prefix: 'faucet-wallet',
});

const FAIL_OPEN_REMAINING = 2;

type WalletCreationLimitStatus = {
  remaining: number;
  reset: number;
  degraded?: boolean;
};

type WalletCreationReservation = WalletCreationLimitStatus & {
  success: boolean;
};

const FAIL_OPEN_STATUS: WalletCreationLimitStatus = {
  remaining: FAIL_OPEN_REMAINING,
  reset: 0,
  degraded: true,
};

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function logRateLimiterFailure(operation: 'check' | 'reserve', userId: string, error: unknown) {
  logger.error(`[faucetRateLimiter] Failed to ${operation} wallet creation limit, failing open:`, {
    userId: userId.substring(0, 8) + '...',
    error: formatErrorForLog(error),
    diagnostics: getUpstashConfigDiagnostics(),
  });
}

export const faucetRateLimiter = {
  /** Read-only: remaining slots and reset time (for GET /check-limit). */
  check: async (userId: string): Promise<WalletCreationLimitStatus> => {
    try {
      const result = await walletCreationRatelimit.getRemaining(userId);
      return {
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      logRateLimiterFailure('check', userId, error);
      return { ...FAIL_OPEN_STATUS };
    }
  },

  /** Consumes one slot when creating a linked wallet (for POST /link). */
  reserve: async (userId: string): Promise<WalletCreationReservation> => {
    try {
      const result = await walletCreationRatelimit.limit(userId);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      logRateLimiterFailure('reserve', userId, error);
      return {
        success: true,
        ...FAIL_OPEN_STATUS,
      };
    }
  },
};
