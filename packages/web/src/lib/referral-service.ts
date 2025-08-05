import type { User, Referral, ReferralAction } from '@prisma/client';
import type { ReferralAction as ReferralActionEnum } from '@/utils/referral-actions';

import { ReferralActionUtils } from '@/utils/referral-actions';

import { prisma } from './prisma';

export type UserWithReferrals = User & {
  referralsGiven: (Referral & { actions: ReferralAction[] })[];
  referralsReceived: (Referral & { actions: ReferralAction[] })[];
  actions: ReferralAction[];
};

export type ReferralWithDetails = Referral & {
  referrer: User;
  referee: User | null;
  actions: ReferralAction[];
};

export class ReferralService {
  static async findOrCreateUser(walletAddress: string): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      return existingUser;
    }

    return prisma.user.create({
      data: { walletAddress },
    });
  }

  static async getUserByWallet(walletAddress: string): Promise<UserWithReferrals | null> {
    return prisma.user.findUnique({
      where: { walletAddress },
      include: {
        referralsGiven: {
          include: { actions: true },
        },
        referralsReceived: {
          include: { actions: true },
        },
        actions: true,
      },
    });
  }

  static async createReferralCode(
    referrerWalletAddress: string,
    customCode?: string
  ): Promise<Referral> {
    const referrer = await this.findOrCreateUser(referrerWalletAddress);

    const code = customCode || this.generateReferralCode();

    const existingReferral = await prisma.referral.findUnique({
      where: { code },
    });

    if (existingReferral) {
      throw new Error('Referral code already exists');
    }

    return prisma.referral.create({
      data: {
        code,
        referrerId: referrer.id,
      },
    });
  }

  static async getReferralByCode(code: string): Promise<ReferralWithDetails | null> {
    return prisma.referral.findUnique({
      where: { code },
      include: {
        referrer: true,
        referee: true,
        actions: true,
      },
    });
  }

  static async activateReferral(
    code: string,
    refereeWalletAddress: string
  ): Promise<ReferralWithDetails> {
    const referral = await this.getReferralByCode(code);

    if (!referral) {
      throw new Error('Referral code not found');
    }

    if (referral.isUsed) {
      throw new Error('Referral code already used');
    }

    if (!referral.isActive) {
      throw new Error('Referral code is inactive');
    }

    if (referral.referrer.walletAddress === refereeWalletAddress) {
      throw new Error('Cannot use your own referral code');
    }

    const referee = await this.findOrCreateUser(refereeWalletAddress);

    const updatedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        refereeId: referee.id,
        isUsed: true,
        usedAt: new Date(),
      },
      include: {
        referrer: true,
        referee: true,
        actions: true,
      },
    });

    return updatedReferral;
  }

  static async recordAction(
    userWalletAddress: string,
    referralCode: string,
    action: string,
    metadata?: {
      amount?: string;
      tokenSymbol?: string;
      [key: string]: any;
    }
  ): Promise<ReferralAction> {
    if (!ReferralActionUtils.isValidAction(action)) {
      throw new Error(
        `Invalid action: ${action}. Valid actions: ${ReferralActionUtils.getValidActions().join(', ')}`
      );
    }

    if (!ReferralActionUtils.isEnabledAction(action)) {
      throw new Error(`Action ${action} is not enabled`);
    }

    const validation = ReferralActionUtils.validateActionMetadata(
      action as ReferralActionEnum,
      metadata
    );
    if (!validation.isValid) {
      throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
    }

    const user = await this.findOrCreateUser(userWalletAddress);
    const referral = await this.getReferralByCode(referralCode);

    if (!referral) {
      throw new Error('Referral not found');
    }

    const existingAction = await prisma.referralAction.findUnique({
      where: {
        userId_referralId_action: {
          userId: user.id,
          referralId: referral.id,
          action,
        },
      },
    });

    if (existingAction) {
      throw new Error('Action already recorded for this referral');
    }

    return prisma.referralAction.create({
      data: {
        userId: user.id,
        referralId: referral.id,
        action,
        amount: metadata?.amount,
        tokenSymbol: metadata?.tokenSymbol,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  }

  static async getUserActions(
    userWalletAddress: string,
    referralCode?: string
  ): Promise<ReferralAction[]> {
    const user = await prisma.user.findUnique({
      where: { walletAddress: userWalletAddress },
    });

    if (!user) {
      return [];
    }

    const where: any = { userId: user.id };

    if (referralCode) {
      const referral = await this.getReferralByCode(referralCode);
      if (referral) {
        where.referralId = referral.id;
      }
    }

    return prisma.referralAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getReferralStats(referrerWalletAddress: string) {
    const referrer = await prisma.user.findUnique({
      where: { walletAddress: referrerWalletAddress },
    });

    if (!referrer) {
      return {
        totalReferrals: 0,
        usedReferrals: 0,
        totalActions: 0,
        actionBreakdown: {},
      };
    }

    const [totalReferrals, usedReferrals, actions] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: referrer.id },
      }),
      prisma.referral.count({
        where: { referrerId: referrer.id, isUsed: true },
      }),
      prisma.referralAction.findMany({
        where: {
          referral: { referrerId: referrer.id },
        },
      }),
    ]);

    const actionBreakdown = actions.reduce(
      (acc: Record<string, number>, action: ReferralAction) => {
        acc[action.action] = (acc[action.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalReferrals,
      usedReferrals,
      totalActions: actions.length,
      actionBreakdown,
    };
  }

  private static generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static getValidActions(): string[] {
    return ReferralActionUtils.getValidActions();
  }

  static getEnabledActions(): string[] {
    return ReferralActionUtils.getEnabledActionStrings();
  }

  static isValidAction(action: string): boolean {
    return ReferralActionUtils.isValidAction(action);
  }

  static isEnabledAction(action: string): boolean {
    return ReferralActionUtils.isEnabledAction(action);
  }

  static getActionConfig(action: string) {
    if (ReferralActionUtils.isValidAction(action)) {
      return ReferralActionUtils.getActionConfig(action as ReferralActionEnum);
    }
    return null;
  }

  static getActionsForUI(enabledOnly: boolean = true) {
    return ReferralActionUtils.getActionsForUI(enabledOnly);
  }
}
