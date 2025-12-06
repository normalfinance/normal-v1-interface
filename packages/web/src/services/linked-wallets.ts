import { logger } from '@normalfinance/utils';

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
    const response = await fetch('/api/wallets/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, walletName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to link wallet');
    }

    return await response.json();
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
    const response = await fetch('/api/wallets/linked', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Update a linked wallet's name
 */
export async function updateWalletName(
  walletAddress: string,
  walletName: string
): Promise<void> {
  try {
    const response = await fetch('/api/wallets/link', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch('/api/wallets/link', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`/api/wallets/link?walletAddress=${encodeURIComponent(walletAddress)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unlink wallet');
    }
  } catch (error) {
    logger.error('[linked-wallets] Failed to unlink wallet:', error);
    throw error;
  }
}


