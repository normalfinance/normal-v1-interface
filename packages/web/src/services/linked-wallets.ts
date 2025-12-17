import { logger } from '@normalfinance/utils';
import { supabase } from '@/lib/createSupabaseClient';

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

async function buildAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
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
