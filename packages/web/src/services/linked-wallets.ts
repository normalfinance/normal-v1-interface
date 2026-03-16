import { logger } from '@normalfinance/utils';
import { buildAuthHeaders } from '@/utils/http';

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

export interface LinkedWallet {
  id: string;
  walletAddress: string;
  walletName: string | null;
  createdAt: string;
  lastUsedAt: string;
  custodyChoice: 'self' | 'platform' | null;
  encryptedMnemonic?: string | null;
  encryptionIV?: string | null;
  encryptionSalt?: string | null;
  custodyConsentEmail?: string | null;
  custodyConsentDate?: string | null;
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
  walletName?: string,
  custodyData?: {
    custodyChoice: 'self' | 'platform';
    encryptedMnemonic?: string;
    encryptionIV?: string;
    encryptionSalt?: string;
    custodyConsentEmail?: string;
  }
): Promise<LinkWalletResponse> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/link', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress, walletName, ...custodyData }),
    });

    if (!response.ok) {
      const error = await response.json();
      // If rate limited, include remaining time in error message
      if (response.status === 429 && error.reset) {
        const remaining = formatRateLimitReset(error.reset);
        throw new Error(`Weekly limit reached. Try again in ${remaining}.`);
      }
      throw new Error(error.error || 'Failed to link wallet');
    }

    return await response.json();
  } catch (error) {
    logger.error('[linked-wallets] Failed to link wallet:', error);
    throw error;
  }
}

/**
 * Update wallet custody choice
 */
export async function updateWalletCustody(
  walletAddress: string,
  custodyData: {
    custodyChoice: 'self' | 'platform';
    encryptedMnemonic?: string;
    encryptionIV?: string;
    encryptionSalt?: string;
    custodyConsentEmail?: string;
  }
): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/custody', {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress, ...custodyData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update wallet custody');
    }
  } catch (error) {
    logger.error('[linked-wallets] Failed to update wallet custody:', error);
    throw error;
  }
}

/**
 * Remove platform custody (delete encrypted mnemonic)
 */
export async function removePlatformCustody(walletAddress: string): Promise<void> {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch('/api/wallets/custody', {
      method: 'DELETE',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove platform custody');
    }
  } catch (error) {
    logger.error('[linked-wallets] Failed to remove platform custody:', error);
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to get linked wallets');
    }

    const data: GetLinkedWalletsResponse = await response.json();
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
      const error = await response.json();
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
      const error = await response.json();
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to check rate limit');
    }

    return await response.json();
  } catch (error) {
    logger.error('[linked-wallets] Failed to check rate limit:', error);
    throw error;
  }
}
