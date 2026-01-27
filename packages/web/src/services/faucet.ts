import { logger, constants } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

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
  walletAddress: string
): Promise<SponsorWalletResponse> {
  try {
    const response = await fetch('/api/faucet/fund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      const error: SponsorWalletError = await response.json();
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
  walletAddress: string
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
    fetch('/api/faucet/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
