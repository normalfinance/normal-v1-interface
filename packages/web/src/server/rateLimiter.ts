import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a Redis client from your .env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Allow 30 requests per 10 seconds, sliding window
export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
});
