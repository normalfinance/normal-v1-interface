import { prisma } from '@/lib/prisma';
import { logger } from '@normalfinance/utils';

const RATE_LIMIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
}

export interface RateLimitCheckResult {
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
}

/**
 * Database-based rate limiter for faucet/sponsorship
 * Replaces Upstash Redis rate limiting by querying SponsoredAccount table
 */
export class FaucetRateLimiter {
  /**
   * Get the most recent non-revoked sponsorship for a user
   */
  private static async getLastSponsorship(supabaseUid: string) {
    return prisma.sponsoredAccount.findFirst({
      where: {
        supabaseUid,
        isRevoked: false,
      },
      orderBy: {
        sponsoredAt: 'desc',
      },
      select: {
        sponsoredAt: true,
      },
    });
  }

  /**
   * Check if user can be sponsored (does not consume the limit)
   * Returns remaining count and reset timestamp
   */
  static async check(supabaseUid: string): Promise<RateLimitCheckResult> {
    try {
      const lastSponsorship = await this.getLastSponsorship(supabaseUid);

      if (!lastSponsorship) {
        // No previous sponsorship - user can be sponsored
        return {
          remaining: 1,
          reset: 0,
        };
      }

      const resetTimestamp = lastSponsorship.sponsoredAt.getTime() + RATE_LIMIT_WINDOW_MS;
      const now = Date.now();

      if (now >= resetTimestamp) {
        // Rate limit window has passed - user can be sponsored again
        return {
          remaining: 1,
          reset: 0,
        };
      }

      // Still within rate limit window
      return {
        remaining: 0,
        reset: resetTimestamp,
      };
    } catch (error) {
      logger.error('[FaucetRateLimiter] Error checking rate limit:', error);
      throw error;
    }
  }

  /**
   * Check rate limit and return result in limit() format
   * Note: The actual "consumption" happens when SponsorService creates the SponsoredAccount record
   */
  static async limit(supabaseUid: string): Promise<RateLimitResult> {
    try {
      const checkResult = await this.check(supabaseUid);

      return {
        success: checkResult.remaining > 0,
        limit: 1,
        remaining: checkResult.remaining > 0 ? 0 : 0,
        reset: checkResult.remaining > 0
          ? Date.now() + RATE_LIMIT_WINDOW_MS
          : checkResult.reset,
      };
    } catch (error) {
      logger.error('[FaucetRateLimiter] Error applying rate limit:', error);
      throw error;
    }
  }
}

/**
 * Export in the same format as the original rateLimiter.faucet for easy migration
 */
export const faucetRateLimiter = {
  limit: (supabaseUid: string) => FaucetRateLimiter.limit(supabaseUid),
  check: (supabaseUid: string) => FaucetRateLimiter.check(supabaseUid),
};
