import { logger, constants } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

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

export interface SponsorWalletResponse {
  success: boolean;
  sponsorshipXDR: string;
  sponsorAddress: string;
}

export interface SponsorWalletError {
  error: string;
  reset?: number;
  details?: any;
}

/**
 * Request sponsorship for a new wallet
 * Returns partially-signed XDR that needs user signature
 */
export async function requestWalletSponsorship(
  walletAddress: string,
  accessToken: string
): Promise<SponsorWalletResponse> {
  try {
    const response = await fetch('/api/faucet/fund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      const error: SponsorWalletError = await response.json();
      // If rate limited, include remaining time in error message
      if (response.status === 429 && error.reset) {
        const remaining = formatRateLimitReset(error.reset);
        throw new Error(`Weekly limit reached. Try again in ${remaining}.`);
      }
      throw new Error(error.error || 'Failed to request sponsorship');
    }

    return await response.json();
  } catch (error: any) {
    logger.error('[faucet] Failed to request wallet sponsorship:', error);
    throw error;
  }
}

/**
 * Submit the fully-signed sponsorship transaction
 * This creates the account, trustline, and transfers fee payment
 */
export async function submitSponsorshipTransaction(
  signedXDR: string,
  walletAddress: string,
  accessToken?: string
): Promise<{ hash: string }> {
  try {
    const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
      allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
    });

    const transaction = TransactionBuilder.fromXDR(
      signedXDR,
      constants.StellarConfig.NETWORK_PASSPHRASE
    );

    const result = await horizonServer.submitTransaction(transaction);

    logger.log('[faucet] Sponsorship transaction submitted:', result.hash);

    // Record the transaction hash (fire and forget)
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    fetch('/api/faucet/confirm', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ walletAddress, txHash: result.hash }),
    }).catch((err) => {
      logger.warn('[faucet] Failed to confirm transaction hash:', err);
    });

    return { hash: result.hash };
  } catch (error: any) {
    logger.error('[faucet] Failed to submit sponsorship transaction:', error);
    throw error;
  }
}
