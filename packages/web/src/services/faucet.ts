import { logger, constants } from '@normalfinance/utils';
import { TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

export interface FundWalletResponse {
  success: boolean;
  txHash: string;
  trustlineXDR: string;
}

export interface FundWalletError {
  error: string;
  reset?: number;
  details?: any;
}

/**
 * Request funding for a new wallet (1 XLM)
 * Returns the funding transaction hash and unsigned trustline XDR
 */
export async function requestFaucetFunding(
  walletAddress: string
): Promise<FundWalletResponse> {
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
      const error: FundWalletError = await response.json();
      throw new Error(error.error || 'Failed to fund wallet');
    }

    return await response.json();
  } catch (error: any) {
    logger.error('[faucet] Failed to request faucet funding:', error);
    throw error;
  }
}

/**
 * Submit a signed trustline transaction
 */
export async function submitTrustlineTransaction(
  signedXDR: string
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
    logger.log('[faucet] Trustline created successfully:', result.hash);
    return { hash: result.hash };
  } catch (error: any) {
    logger.error('[faucet] Failed to submit trustline transaction:', error);
    throw error;
  }
}
