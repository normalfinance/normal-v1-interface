import 'server-only';
import { prisma } from '@/lib/prisma';
import { logger } from '@normalfinance/utils';

const RATE_LIMIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_SPONSORSHIPS_PER_WINDOW = 2; // Allow 2 wallets per week

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
   * Get all non-revoked sponsorships for a user within the rate limit window
   */
  private static async getSponsorshipsInWindow(supabaseUid: string) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    return prisma.sponsoredAccount.findMany({
      where: {
        supabaseUid,
        isRevoked: false,
        sponsoredAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        sponsoredAt: 'asc',
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
      const sponsorshipsInWindow = await this.getSponsorshipsInWindow(supabaseUid);
      const count = sponsorshipsInWindow.length;
      const remaining = MAX_SPONSORSHIPS_PER_WINDOW - count;

      if (remaining > 0) {
        // User can still be sponsored
        return {
          remaining,
          reset: 0,
        };
      }

      // Rate limited - calculate reset time based on oldest sponsorship in window
      const oldestSponsorship = sponsorshipsInWindow[0];
      const resetTimestamp = oldestSponsorship.sponsoredAt.getTime() + RATE_LIMIT_WINDOW_MS;

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
        limit: MAX_SPONSORSHIPS_PER_WINDOW,
        remaining: checkResult.remaining > 0 ? checkResult.remaining - 1 : 0,
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
