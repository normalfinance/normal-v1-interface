import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InviteCodeService {
  /**
   * Verify if an invite code exists and is valid (not used)
   */
  static async verifyInviteCode(code: string): Promise<{
    isValid: boolean;
    message?: string;
    testnetUser?: any;
  }> {
    try {
      const testnetUser = await prisma.testnetUser.findUnique({
        where: { inviteCode: code },
      });

      if (!testnetUser) {
        return {
          isValid: false,
          message: 'Invalid invite code. Please check your code and try again.',
        };
      }

      if (testnetUser.isUsed) {
        return {
          isValid: false,
          message: 'This invite code has already been used.',
        };
      }

      return {
        isValid: true,
        message: 'Valid invite code!',
        testnetUser,
      };
    } catch (error) {
      console.error('Error verifying invite code:', error);
      return {
        isValid: false,
        message: 'An error occurred while verifying the invite code.',
      };
    }
  }

  /**
   * Consume an invite code and associate it with a wallet address
   */
  static async consumeInviteCode(
    code: string,
    walletAddress?: string
  ): Promise<{
    success: boolean;
    message: string;
    testnetUser?: any;
  }> {
    try {
      // First verify the code is valid
      const verification = await this.verifyInviteCode(code);
      if (!verification.isValid) {
        return {
          success: false,
          message: verification.message || 'Invalid invite code',
        };
      }

      // Update the code as used
      const updatedUser = await prisma.testnetUser.update({
        where: { inviteCode: code },
        data: {
          isUsed: true,
          usedAt: new Date(),
          walletAddress: walletAddress || null,
        },
      });

      return {
        success: true,
        message: 'Invite code successfully verified! Welcome to the testnet.',
        testnetUser: updatedUser,
      };
    } catch (error) {
      console.error('Error consuming invite code:', error);
      return {
        success: false,
        message: 'An error occurred while processing the invite code.',
      };
    }
  }

  /**
   * Check if a wallet address has already used an invite code
   */
  static async hasWalletUsedCode(walletAddress: string): Promise<boolean> {
    try {
      const existingUser = await prisma.testnetUser.findUnique({
        where: { walletAddress },
      });
      return !!existingUser;
    } catch (error) {
      console.error('Error checking wallet usage:', error);
      return false;
    }
  }

  /**
   * Get invite code usage for a specific wallet
   */
  static async getWalletInviteCode(walletAddress: string) {
    try {
      return await prisma.testnetUser.findUnique({
        where: { walletAddress },
      });
    } catch (error) {
      console.error('Error getting wallet invite code:', error);
      return null;
    }
  }

  /**
   * Generate a tweet for getting an invite code
   */
  static generateTweetContent(): {
    text: string;
    url: string;
  } {
    const tweetText = "Just got my invite code for @normalfinance testnet! 🚀 Excited to try out the future of DeFi. #NormalFinance #DeFi #Testnet";
    const encodedText = encodeURIComponent(tweetText);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    return {
      text: tweetText,
      url: tweetUrl,
    };
  }

  /**
   * Get recent activity for admin dashboard
   */
  static async getRecentActivity(limit: number = 10) {
    try {
      const recentUsage = await prisma.testnetUser.findMany({
        where: { isUsed: true },
        orderBy: { usedAt: 'desc' },
        take: limit,
        select: {
          inviteCode: true,
          usedAt: true,
          walletAddress: true,
          source: true,
        },
      });

      return recentUsage;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
}