import { logger } from '@normalfinance/utils';
import { buildAuthHeaders } from '@/utils/http';

/**
 * Safely parse a fetch response as JSON.
 * Throws a descriptive error if the response body is not valid JSON (e.g. an HTML error page).
 */
async function safeJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      `Expected JSON response but got ${contentType || 'unknown content-type'} (status ${response.status}): ${text.slice(0, 200)}`
    );
  }
  return response.json();
}

/**
 * Format remaining time until rate limit reset
 */
function formatRateLimitReset(resetTimestamp: number): string {
  const diffMs = resetTimestamp - Date.now();
  if (diffMs <= 0) return 'now';

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);

  return parts.length > 0 ? parts.join(', ') : 'less than an hour';
}

/** Remaining wallet-link allowance for this user, WITHOUT consuming one.
 *  Returns null when the answer can't be obtained — callers must treat that
 *  as "allowed", since the authoritative check still runs server-side on the
 *  link itself and a broken check must never block wallet creation. */
export async function checkWalletLinkLimit(): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
} | null> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/check-limit', { headers, credentials: 'include' });
    if (!response.ok) return null;
    const data = await safeJson(response);
    if (typeof data?.remaining !== 'number') return null;
    return { allowed: data.allowed !== false, remaining: data.remaining, reset: data.reset ?? 0 };
  } catch {
    return null;
  }
}

/** Human wait time until the limit frees a slot. Exported for the callers
 *  that pre-check, so one formatter serves both paths. */
export function describeRateLimitReset(reset: number): string {
  return formatRateLimitReset(reset);
}

export interface LinkedWallet {
  id: string;
  walletAddress: string;
  walletName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export interface LinkWalletResponse {
  success: boolean;
  wallet: LinkedWallet;
}

export interface GetLinkedWalletsResponse {
  wallets: LinkedWallet[];
}

/**
 * Link a wallet to the current user's account
 */
export async function linkWallet(
  walletAddress: string,
  walletName?: string
): Promise<LinkWalletResponse> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/link', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress, walletName }),
    });

    if (!response.ok) {
      const error = await safeJson(response);
      // If rate limited, include remaining time in error message
      if (response.status === 429) {
        // The server enforces 3 per rolling DAY (faucet-rate-limiter:
        // slidingWindow(3, '1 d')). Saying "Weekly limit reached. Try again
        // in 4 hours." — as this did — is both wrong and self-contradicting,
        // so take the server's own wording and add only the wait.
        const wait = error.reset ? formatRateLimitReset(error.reset) : null;
        const base = error.error || 'You can only add 3 wallets per day.';
        throw new Error(wait ? `${base} Try again in ${wait}.` : base);
      }
      throw new Error(error.error || 'Failed to link wallet');
    }

    return await safeJson(response);
  } catch (error) {
    logger.error('[linked-wallets] Failed to link wallet:', error);
    throw error;
  }
}

/**
 * Get all wallets linked to the current user's account
 */
export async function getLinkedWallets(): Promise<LinkedWallet[]> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/linked', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await safeJson(response);
      throw new Error(error.error || 'Failed to get linked wallets');
    }

    const data: GetLinkedWalletsResponse = await safeJson(response);
    return data.wallets;
  } catch (error) {
    logger.error('[linked-wallets] Failed to get linked wallets:', error);
    throw error;
  }
}

export async function isWalletLinked(walletAddress: string): Promise<boolean> {
  const wallets = await getLinkedWallets();
  return wallets.some((wallet) => wallet.walletAddress === walletAddress);
}

/**
 * Update a linked wallet's name
 */
export async function updateWalletName(walletAddress: string, walletName: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/link', {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress, walletName }),
    });

    if (!response.ok) {
      const error = await safeJson(response);
      throw new Error(error.error || 'Failed to update wallet name');
    }
  } catch (error) {
    logger.error('[linked-wallets] Failed to update wallet name:', error);
    throw error;
  }
}

/**
 * Update a linked wallet's lastUsedAt timestamp
 */
export async function updateLastUsed(walletAddress: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/link', {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      // Don't throw - this is a non-critical operation
      logger.warn('[linked-wallets] Failed to update lastUsedAt');
    }
  } catch (error) {
    // Don't throw - this is a non-critical operation
    logger.warn('[linked-wallets] Failed to update lastUsedAt:', error);
  }
}

/**
 * Unlink a wallet from the current user's account
 */
export async function unlinkWallet(walletAddress: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch(
      `/api/wallets/link?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await safeJson(response);
      throw new Error(error.error || 'Failed to unlink wallet');
    }
  } catch (error) {
    logger.error('[linked-wallets] Failed to unlink wallet:', error);
    throw error;
  }
}

export interface WalletCreationLimitStatus {
  allowed: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check wallet creation rate limit status
 * @returns Object with allowed status and reset timestamp
 */
export async function checkWalletCreationLimit(): Promise<WalletCreationLimitStatus> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/check-limit', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await safeJson(response);
      throw new Error(error.error || 'Failed to check rate limit');
    }

    return await safeJson(response);
  } catch (error) {
    logger.error('[linked-wallets] Failed to check rate limit:', error);
    throw error;
  }
}
