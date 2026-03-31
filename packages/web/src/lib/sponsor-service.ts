import { prisma } from '@/lib/prisma';
import { logger, constants } from '@normalfinance/utils';
import { Asset, Keypair, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

export interface SponsoredAccountResult {
  sponsorshipXDR: string;
  sponsorAddress: string;
}

export interface SponsorshipRecord {
  id: string;
  walletAddress: string;
  sponsorAddress: string;
  txHash: string | null;
  sponsoredAt: Date;
  isRevoked: boolean;
}

export class SponsorService {
  /**
   * Check if account has already been sponsored
   */
  static async hasBeenSponsored(walletAddress: string): Promise<boolean> {
    try {
      const record = await prisma.sponsoredAccount.findUnique({
        where: { walletAddress },
      });
      return !!record && !record.isRevoked;
    } catch (error) {
      logger.error('[SponsorService] Failed to check sponsorship status:', error);
      throw error;
    }
  }

  /**
   * Get sponsorship record for a wallet
   */
  static async getSponsorshipRecord(walletAddress: string): Promise<SponsorshipRecord | null> {
    try {
      const record = await prisma.sponsoredAccount.findUnique({
        where: { walletAddress },
      });
      return record as SponsorshipRecord | null;
    } catch (error) {
      logger.error('[SponsorService] Failed to get sponsorship record:', error);
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
      logger.error('[SponsorService] Error checking account existence:', error);
      throw error;
    }
  }

  /**
   * Create a sponsored account with USDC trustline
   * Returns partially-signed XDR that needs client signature
   *
   * Transaction structure (sandwich pattern):
   * 1. BeginSponsoringFutureReserves (sponsor -> user)
   * 2. CreateAccount with startingBalance: '0' (sponsored)
   * 3. ChangeTrust for USDC (sponsored)
   * 4. EndSponsoringFutureReserves (user)
   * 5. Payment of 0.001 XLM for transaction fees
   */
  static async createSponsoredAccount(
    walletAddress: string,
    supabaseUid: string,
    ipAddress: string
  ): Promise<SponsoredAccountResult> {
    const sponsorSecretKey = process.env.NORMAL_HOT_A_SECRET;
    if (!sponsorSecretKey) {
      throw new Error('NORMAL_HOT_A_SECRET environment variable is not set');
    }

    try {
      const sponsorKeypair = Keypair.fromSecret(sponsorSecretKey);
      const sponsorAddress = sponsorKeypair.publicKey();

      const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      const sponsorAccount = await horizonServer.loadAccount(sponsorAddress);

      const feeStats = await horizonServer.feeStats();
      const baseFee = feeStats.fee_charged.p90;

      const usdcAsset = new Asset('USDC', constants.StellarConfig.USDC_ISSUER);

      const builder = new TransactionBuilder(sponsorAccount, {
        fee: baseFee.toString(),
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      })
        // 1. Sponsor begins sponsoring future reserves for the user
        .addOperation(
          Operation.beginSponsoringFutureReserves({
            sponsoredId: walletAddress,
            source: sponsorAddress,
          })
        )
        // 2. Create the user's account with 1 XLM (minimum for createAccount)
        // The reserve requirement is still sponsored, so user keeps the full 1 XLM
        .addOperation(
          Operation.createAccount({
            destination: walletAddress,
            startingBalance: process.env.NEXT_PUBLIC_STELLAR_STARTING_BALANCE ?? '1',
            source: sponsorAddress,
          })
        )
        // 3. Add USDC trustline (reserve is sponsored)
        .addOperation(
          Operation.changeTrust({
            asset: usdcAsset,
            source: walletAddress,
          })
        );

      // 3b. Add Blend USDC trustline if configured (testnet only, reserve is sponsored)
      const blendUsdcIssuer = constants.StellarConfig.BLEND_USDC_ISSUER;
      if (blendUsdcIssuer) {
        builder.addOperation(
          Operation.changeTrust({
            asset: new Asset('USDC', blendUsdcIssuer),
            source: walletAddress,
          })
        );
      }

      const transaction = builder
        // 4. User ends the sponsorship (required for the sandwich pattern)
        .addOperation(
          Operation.endSponsoringFutureReserves({
            source: walletAddress,
          })
        )
        .setTimeout(300) // 5 minute timeout for user to sign
        .build();

      // Sponsor signs the transaction
      transaction.sign(sponsorKeypair);

      // Convert to XDR - client will add their signature
      const sponsorshipXDR = transaction.toXDR();

      logger.log('[SponsorService] Created sponsorship XDR for:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
        sponsor: sponsorAddress.substring(0, 8) + '...',
      });

      return {
        sponsorshipXDR,
        sponsorAddress,
      };
    } catch (error: any) {
      logger.error('[SponsorService] Failed to create sponsored account:', error);
      throw error;
    }
  }

  /**
   * Record the transaction hash after successful submission
   */
  static async recordTransactionHash(params: {
    walletAddress: string;
    txHash: string;
    ipAddress: string;
    supabaseUid?: string;
  }): Promise<void> {
    const { walletAddress, txHash, ipAddress, supabaseUid } = params;

    const sponsorSecretKey = process.env.NORMAL_HOT_A_SECRET;
    if (!sponsorSecretKey) {
      throw new Error('NORMAL_HOT_A_SECRET environment variable is not set');
    }

    const sponsorKeypair = Keypair.fromSecret(sponsorSecretKey);
    const sponsorAddress = sponsorKeypair.publicKey();

    try {
      await prisma.sponsoredAccount.upsert({
        where: { walletAddress },
        update: { txHash },
        create: {
          supabaseUid,
          walletAddress,
          sponsorAddress,
          ipAddress,
          accountReserve: '0.5',
          trustlineReserve: constants.StellarConfig.BLEND_USDC_ISSUER ? '1.0' : '0.5',
          feePayment: '1',
          txHash,
        },
      });
      logger.log('[SponsorService] Recorded transaction hash:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
        txHash,
      });
    } catch (error) {
      logger.error('[SponsorService] Failed to record transaction hash:', error);
      throw error;
    }
  }

  /**
   * Revoke sponsorship for an account (abuse mitigation)
   * This returns the locked reserves to the sponsor
   */
  static async revokeSponsorship(walletAddress: string, reason: string): Promise<string> {
    const sponsorSecretKey = process.env.NORMAL_HOT_A_SECRET;
    if (!sponsorSecretKey) {
      throw new Error('NORMAL_HOT_A_SECRET environment variable is not set');
    }

    const record = await prisma.sponsoredAccount.findUnique({
      where: { walletAddress },
    });

    if (!record) {
      throw new Error('Sponsorship record not found');
    }

    if (record.isRevoked) {
      throw new Error('Sponsorship has already been revoked');
    }

    try {
      const sponsorKeypair = Keypair.fromSecret(sponsorSecretKey);
      const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      const sponsorAccount = await horizonServer.loadAccount(sponsorKeypair.publicKey());
      const feeStats = await horizonServer.feeStats();
      const baseFee = feeStats.fee_charged.p90;

      const usdcAsset = new Asset('USDC', constants.StellarConfig.USDC_ISSUER);

      // Revoke sponsorship for account and trustlines
      const revokeBuilder = new TransactionBuilder(sponsorAccount, {
        fee: baseFee.toString(),
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.revokeAccountSponsorship({
            account: walletAddress,
          })
        )
        .addOperation(
          Operation.revokeTrustlineSponsorship({
            account: walletAddress,
            asset: usdcAsset,
          })
        );

      // Revoke Blend USDC trustline sponsorship if configured
      const blendUsdcIssuer = constants.StellarConfig.BLEND_USDC_ISSUER;
      if (blendUsdcIssuer) {
        revokeBuilder.addOperation(
          Operation.revokeTrustlineSponsorship({
            account: walletAddress,
            asset: new Asset('USDC', blendUsdcIssuer),
          })
        );
      }

      const transaction = revokeBuilder.setTimeout(30).build();

      transaction.sign(sponsorKeypair);
      const result = await horizonServer.submitTransaction(transaction);

      await prisma.sponsoredAccount.update({
        where: { walletAddress },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revocationTxHash: result.hash,
          revocationReason: reason,
        },
      });

      logger.log('[SponsorService] Revoked sponsorship for:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
        reason,
        txHash: result.hash,
      });

      return result.hash;
    } catch (error: any) {
      logger.error('[SponsorService] Failed to revoke sponsorship:', error);
      throw error;
    }
  }

  /**
   * Get sponsorship statistics
   */
  static async getStats(): Promise<{
    totalSponsored: number;
    totalRevoked: number;
    totalLockedXLM: string;
  }> {
    const [totalSponsored, totalRevoked] = await Promise.all([
      prisma.sponsoredAccount.count({ where: { isRevoked: false } }),
      prisma.sponsoredAccount.count({ where: { isRevoked: true } }),
    ]);

    // Each active sponsorship locks 1.0-1.5 XLM (0.5 base + 0.5-1.0 trustlines)
    const totalLockedXLM = (totalSponsored * 1.0).toFixed(7);

    return {
      totalSponsored,
      totalRevoked,
      totalLockedXLM,
    };
  }
}
