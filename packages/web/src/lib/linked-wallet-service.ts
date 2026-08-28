import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export interface LinkedWallet {
  id: string;
  supabaseUid: string;
  walletAddress: string;
  walletName: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export class LinkedWalletService {
  /**
   * Link a wallet to a Supabase user account
   */
  static async linkWallet(
    supabaseUid: string,
    walletAddress: string,
    walletName?: string
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
        },
        create: {
          supabaseUid,
          walletAddress,
          walletName: walletName ?? null,
        },
      });

      logger.log('[LinkedWalletService] Wallet linked successfully:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
        walletAddress: walletAddress.substring(0, 8) + '...',
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

  static async getLinkedWalletByAddress(
    walletAddress: string
  ): Promise<{ supabaseUid: string } | null> {
    try {
      const wallet = await prisma.linkedWallet.findFirst({
        where: { walletAddress },
        select: {
          supabaseUid: true,
        },
      });
      if (!wallet) return null;
      return { supabaseUid: wallet.supabaseUid };
    } catch (error) {
      logger.error('[LinkedWalletService] Failed to get linked wallet by address:', error);
      return null;
    }
  }

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
}
