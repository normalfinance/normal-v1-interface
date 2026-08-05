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

const upstashConfig = getUpstashConfig();

function getSafeUrlDiagnostics(url?: string) {
  if (!url) {
    return {
      urlHost: null,
      urlPath: null,
      urlProtocol: null,
      urlValid: false,
    };
  }

  try {
    const parsed = new URL(url);
    return {
      urlHost: parsed.host,
      urlPath: parsed.pathname || '/',
      urlProtocol: parsed.protocol,
      urlValid: true,
    };
  } catch {
    return {
      urlHost: null,
      urlPath: null,
      urlProtocol: null,
      urlValid: false,
    };
  }
}

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

export function getUpstashConfigDiagnostics() {
  const token = upstashConfig.token;

  return {
    network: constants.getCurrentNetwork(),
    hasUrl: Boolean(upstashConfig.url),
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
    tokenHasWhitespace:
      typeof token === 'string' ? token.trim() !== token || /\s/.test(token) : false,
    ...getSafeUrlDiagnostics(upstashConfig.url),
  };
}

logger.log('[RateLimiter] Upstash config diagnostics:', getUpstashConfigDiagnostics());

// Create a Redis client from your .env
export let redis: Redis;

try {
  redis = new Redis(upstashConfig);
} catch (error) {
  logger.error('[RateLimiter] Failed to initialize Upstash Redis client:', {
    error: formatErrorForLog(error),
    diagnostics: getUpstashConfigDiagnostics(),
  });

  // Keep the app booting even if Redis is misconfigured. Individual routes can
  // decide whether to fail open or fail closed when requests reach the limiter.
  redis = new Redis({ url: '', token: '' });
}

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

// Quote routes stay UNAUTHENTICATED on purpose — users see prices before
// connecting a wallet — but they proxy services we pay for (Soroswap, LI.FI),
// so they need a ceiling keyed on the only identity we have: the IP.
export const quoteRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  prefix: 'quote',
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
