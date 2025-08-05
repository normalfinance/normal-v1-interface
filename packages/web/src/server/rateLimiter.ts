import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Create a Redis client from your .env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
