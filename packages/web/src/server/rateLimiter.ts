import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { logger, constants } from '@normalfinance/utils';

function getUpstashConfig() {
  const network = constants.getCurrentNetwork();

  switch (network) {
    case 'testnet':
      return {
        url: process.env.UPSTASH_REDIS_TESTNET_REST_URL!,
        token: process.env.UPSTASH_REDIS_TESTNET_REST_TOKEN!,
      };
    case 'mainnet':
      return {
        url: process.env.UPSTASH_REDIS_MAINNET_REST_URL!,
        token: process.env.UPSTASH_REDIS_MAINNET_REST_TOKEN!,
      };
    default:
      return {
        url: process.env.UPSTASH_REDIS_TESTNET_REST_URL!,
        token: process.env.UPSTASH_REDIS_TESTNET_REST_TOKEN!,
      };
  }
}

logger.log('getUpstashConfig', getUpstashConfig());

// Create a Redis client from your .env
export const redis = new Redis(getUpstashConfig());

// Allow 30 requests per 10 seconds, sliding window
const walletRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
});

// Allow 50 requests per 10 seconds per IP, sliding window
const ipRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '10 s'),
});

// Allow 3 requests per 10 minutes, sliding window (for mnemonic export)
export const exportMnemonicRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '10 m'),
  prefix: 'export-mnemonic',
});

export const rateLimiter = {
  limit: async (walletAddress: string, ip?: string) => {
    // Rate limit by wallet address
    const walletResult = await walletRateLimiter.limit(walletAddress);

    // Rate limit by IP if provided
    if (ip) {
      const ipResult = await ipRateLimiter.limit(ip);

      // Both must pass for the request to be allowed
      return {
        success: walletResult.success && ipResult.success,
        limit: Math.min(walletResult.limit, ipResult.limit),
        remaining: Math.min(walletResult.remaining, ipResult.remaining),
        reset: Math.max(walletResult.reset, ipResult.reset),
      };
    }

    // Only wallet rate limiting
    return walletResult;
  },
};
