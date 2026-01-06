import { prisma } from '@/lib/prisma';
import { logger } from '@normalfinance/utils';

export interface LinkedWallet {
  id: string;
  supabaseUid: string;
  walletAddress: string;
  walletName: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  custodyChoice: 'self' | 'platform' | null;
  encryptedMnemonic: string | null;
  encryptionIV: string | null;
  encryptionSalt: string | null;
  custodyConsentEmail: string | null;
  custodyConsentDate: Date | null;
}

export class LinkedWalletService {
  /**
   * Link a wallet to a Supabase user account
   */
  static async linkWallet(
    supabaseUid: string,
    walletAddress: string,
    walletName?: string,
    custodyData?: {
      custodyChoice: 'self' | 'platform';
      encryptedMnemonic?: string;
      encryptionIV?: string;
      encryptionSalt?: string;
      custodyConsentEmail?: string;
    }
  ): Promise<LinkedWallet> {
    try {
      const linkedWallet = await prisma.linkedWallet.upsert({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        update: {
          walletName: walletName ?? undefined,
          lastUsedAt: new Date(),
          ...(custodyData && {
            custodyChoice: custodyData.custodyChoice,
            encryptedMnemonic: custodyData.encryptedMnemonic ?? null,
            encryptionIV: custodyData.encryptionIV ?? null,
            encryptionSalt: custodyData.encryptionSalt ?? null,
            custodyConsentEmail: custodyData.custodyConsentEmail ?? null,
            custodyConsentDate: custodyData.custodyConsentEmail ? new Date() : null,
          }),
        },
        create: {
          supabaseUid,
          walletAddress,
          walletName: walletName ?? null,
          custodyChoice: custodyData?.custodyChoice ?? null,
          encryptedMnemonic: custodyData?.encryptedMnemonic ?? null,
          encryptionIV: custodyData?.encryptionIV ?? null,
          encryptionSalt: custodyData?.encryptionSalt ?? null,
          custodyConsentEmail: custodyData?.custodyConsentEmail ?? null,
          custodyConsentDate: custodyData?.custodyConsentEmail ? new Date() : null,
        },
      });

      logger.log('[LinkedWalletService] Wallet linked successfully:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
        custodyChoice: custodyData?.custodyChoice ?? 'none',
      });

      return linkedWallet as LinkedWallet;
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to link wallet:', error);
      throw error;
    }
  }

  /**
   * Get all wallets linked to a Supabase user account
   */
  static async getLinkedWallets(supabaseUid: string): Promise<LinkedWallet[]> {
    try {
      const wallets = await prisma.linkedWallet.findMany({
        where: { supabaseUid },
        orderBy: { lastUsedAt: 'desc' },
      });

      return wallets as LinkedWallet[];
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to get linked wallets:', error);
      throw error;
    }
  }

  /**
   * Update wallet name
   */
  static async updateWalletName(
    supabaseUid: string,
    walletAddress: string,
    walletName: string
  ): Promise<LinkedWallet> {
    try {
      const wallet = await prisma.linkedWallet.update({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        data: { walletName },
      });

      return wallet as LinkedWallet;
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to update wallet name:', error);
      throw error;
    }
  }

  /**
   * Update lastUsedAt timestamp
   */
  static async updateLastUsed(supabaseUid: string, walletAddress: string): Promise<void> {
    try {
      await prisma.linkedWallet.update({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to update lastUsedAt:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Check if a wallet is linked to a user
   */
  static async isWalletLinked(supabaseUid: string, walletAddress: string): Promise<boolean> {
    try {
      const wallet = await prisma.linkedWallet.findUnique({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
      });

      return !!wallet;
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to check if wallet is linked:', error);
      return false;
    }
  }

  /**
   * Unlink a wallet from a user account
   */
  static async unlinkWallet(supabaseUid: string, walletAddress: string): Promise<void> {
    try {
      await prisma.linkedWallet.delete({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
      });

      logger.log('[LinkedWalletService] Wallet unlinked successfully:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to unlink wallet:', error);
      throw error;
    }
  }

  /**
   * Update wallet custody choice and encrypted mnemonic
   */
  static async updateWalletCustody(
    supabaseUid: string,
    walletAddress: string,
    custodyData: {
      custodyChoice: 'self' | 'platform';
      encryptedMnemonic?: string;
      encryptionIV?: string;
      encryptionSalt?: string;
      custodyConsentEmail?: string;
    }
  ): Promise<LinkedWallet> {
    try {
      const wallet = await prisma.linkedWallet.update({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        data: {
          custodyChoice: custodyData.custodyChoice,
          encryptedMnemonic: custodyData.encryptedMnemonic ?? null,
          encryptionIV: custodyData.encryptionIV ?? null,
          encryptionSalt: custodyData.encryptionSalt ?? null,
          custodyConsentEmail: custodyData.custodyConsentEmail ?? null,
          custodyConsentDate: custodyData.custodyConsentEmail ? new Date() : null,
        },
      });

      logger.log('[LinkedWalletService] Wallet custody updated:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
        custodyChoice: custodyData.custodyChoice,
      });

      return wallet as LinkedWallet;
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to update wallet custody:', error);
      throw error;
    }
  }

  /**
   * Remove platform custody (delete encrypted mnemonic)
   */
  static async removePlatformCustody(
    supabaseUid: string,
    walletAddress: string
  ): Promise<LinkedWallet> {
    try {
      const wallet = await prisma.linkedWallet.update({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        data: {
          custodyChoice: 'self',
          encryptedMnemonic: null,
          encryptionIV: null,
          encryptionSalt: null,
          custodyConsentEmail: null,
          custodyConsentDate: null,
        },
      });

      logger.log('[LinkedWalletService] Platform custody removed:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
      });

      return wallet as LinkedWallet;
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to remove platform custody:', error);
      throw error;
    }
  }

  /**
   * Get encrypted mnemonic data for a wallet (only if platform custody)
   */
  static async getEncryptedMnemonic(
    supabaseUid: string,
    walletAddress: string
  ): Promise<{
    encryptedMnemonic: string;
    encryptionIV: string;
    encryptionSalt: string;
  } | null> {
    try {
      const wallet = await prisma.linkedWallet.findUnique({
        where: {
          supabaseUid_walletAddress: {
            supabaseUid,
            walletAddress,
          },
        },
        select: {
          custodyChoice: true,
          encryptedMnemonic: true,
          encryptionIV: true,
          encryptionSalt: true,
        },
      });

      if (!wallet || wallet.custodyChoice !== 'platform') {
        return null;
      }

      if (!wallet.encryptedMnemonic || !wallet.encryptionIV || !wallet.encryptionSalt) {
        return null;
      }

      return {
        encryptedMnemonic: wallet.encryptedMnemonic,
        encryptionIV: wallet.encryptionIV,
        encryptionSalt: wallet.encryptionSalt,
      };
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to get encrypted mnemonic:', error);
      throw error;
    }
  }
}
