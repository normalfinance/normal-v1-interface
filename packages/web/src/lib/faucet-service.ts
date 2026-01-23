import { prisma } from '@/lib/prisma';
import { logger, constants } from '@normalfinance/utils';
import { Asset, Keypair, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

export interface FaucetFunding {
  id: string;
  walletAddress: string;
  ipAddress: string;
  xlmAmount: string;
  txHash: string | null;
  trustlineHash: string | null;
  createdAt: Date;
}

export class FaucetService {
  /**
   * Check if a wallet has already been funded by the faucet
   */
  static async hasWalletBeenFunded(walletAddress: string): Promise<boolean> {
    try {
      const funding = await prisma.faucetFunding.findUnique({
        where: { walletAddress },
      });
      return !!funding;
    } catch (error) {
      logger.error('[FaucetService] Failed to check funding status:', error);
      throw error;
    }
  }

  /**
   * Get funding record for a wallet
   */
  static async getFundingRecord(walletAddress: string): Promise<FaucetFunding | null> {
    try {
      const funding = await prisma.faucetFunding.findUnique({
        where: { walletAddress },
      });
      return funding as FaucetFunding | null;
    } catch (error) {
      logger.error('[FaucetService] Failed to get funding record:', error);
      return null;
    }
  }

  /**
   * Check if an account exists on Stellar network
   */
  static async accountExists(walletAddress: string): Promise<boolean> {
    try {
      const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      await horizonServer.accounts().accountId(walletAddress).call();
      return true;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return false;
      }
      logger.error('[FaucetService] Error checking account existence:', error);
      throw error;
    }
  }

  /**
   * Fund a new wallet with XLM
   */
  static async fundNewWallet(
    walletAddress: string,
    ipAddress: string,
    xlmAmount: string = '3'
  ): Promise<{ txHash: string; trustlineXDR: string }> {
    const faucetSecretKey = process.env.NORMAL_HOT_A_SECRET;
    if (!faucetSecretKey) {
      throw new Error('NORMAL_HOT_A_SECRET environment variable is not set');
    }

    try {
      const faucetKeypair = Keypair.fromSecret(faucetSecretKey);
      const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      const faucetAccount = await horizonServer.loadAccount(faucetKeypair.publicKey());

      const feeStats = await horizonServer.feeStats();
      const baseFee = feeStats.fee_charged.p90;

      const transaction = new TransactionBuilder(faucetAccount, {
        fee: baseFee.toString(),
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.createAccount({
            destination: walletAddress,
            startingBalance: xlmAmount,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(faucetKeypair);

      const result = await horizonServer.submitTransaction(transaction);
      const txHash = result.hash;

      logger.log('[FaucetService] Wallet funded successfully:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
        txHash,
      });

      const fundedAccount = await horizonServer.loadAccount(walletAddress);

      const usdcAsset = new Asset('USDC', constants.StellarConfig.USDC_ISSUER);
      const trustlineTransaction = new TransactionBuilder(fundedAccount, {
        fee: baseFee.toString(),
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.changeTrust({
            asset: usdcAsset,
          })
        )
        .setTimeout(30)
        .build();

      const trustlineXDR = trustlineTransaction.toXDR();

      await prisma.faucetFunding.create({
        data: {
          walletAddress,
          ipAddress,
          xlmAmount,
          txHash,
        },
      });

      return { txHash, trustlineXDR };
    } catch (error: any) {
      logger.error('[FaucetService] Failed to fund wallet:', error);
      throw error;
    }
  }

  /**
   * Record trustline transaction hash
   */
  static async recordTrustlineHash(walletAddress: string, trustlineHash: string): Promise<void> {
    try {
      await prisma.faucetFunding.update({
        where: { walletAddress },
        data: { trustlineHash },
      });
    } catch (error) {
      logger.error('[FaucetService] Failed to record trustline hash:', error);
      throw error;
    }
  }
}
