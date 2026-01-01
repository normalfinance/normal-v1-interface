import type { IndexFund } from '@prisma/client';
import type { IndexFundContract } from '@normalfinance/contracts';

import { Decimal } from '@prisma/client/runtime/library';
import { constants } from '@normalfinance/utils';
import {
  IndexFundFactoryContract,
  IndexFundContract as IndexFundContractClient,
} from '@normalfinance/contracts';

import { prisma } from './prisma';

export type LeaderboardMetric = 'tvl' | 'deposits' | 'netFlow';
export type LeaderboardVisibility = 'all' | 'public' | 'private';

export interface LeaderboardParams {
  metric: LeaderboardMetric;
  visibility: LeaderboardVisibility;
  page: number;
  limit: number;
}

export interface LeaderboardRanking {
  rank: number;
  id: string;
  address: string;
  sequence: number;
  managerAddress: string;
  isPublic: boolean;
  tvlUsd: string;
  totalShares: string;
  totalMints: string;
  totalRedemptions: string;
  netFlow: string;
  baseNav: string;
  sharePrice: string;
  tokenAddress: string;
  lastSyncedAt: string;
}

export interface LeaderboardResponse {
  rankings: LeaderboardRanking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata: {
    metric: LeaderboardMetric;
    visibility: LeaderboardVisibility;
    lastUpdated: string | null;
  };
}

export interface LeaderboardStats {
  totalFunds: number;
  publicFunds: number;
  privateFunds: number;
  totalTvlUsd: string;
}

const STELLAR_DECIMALS = 7;

export class LeaderboardService {
  /**
   * Get leaderboard rankings with pagination
   */
  static async getLeaderboard(params: LeaderboardParams): Promise<LeaderboardResponse> {
    const { metric, visibility, page, limit } = params;

    // Build where clause based on visibility
    const where: { isPublic?: boolean } = {};
    if (visibility === 'public') {
      where.isPublic = true;
    } else if (visibility === 'private') {
      where.isPublic = false;
    }

    // Get total count for pagination
    const total = await prisma.indexFund.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Build orderBy based on metric
    let orderBy: any;
    switch (metric) {
      case 'tvl':
        orderBy = { tvlUsd: 'desc' };
        break;
      case 'deposits':
        orderBy = { tvlUsd: 'desc' };
        break;
      case 'netFlow':
        orderBy = { tvlUsd: 'desc' };
        break;
      default:
        orderBy = { tvlUsd: 'desc' };
    }

    // Fetch all funds for ranking (needed to calculate proper ranks)
    const allFunds = await prisma.indexFund.findMany({
      where,
      orderBy,
    });

    // Sort by the appropriate metric for proper ranking
    const sortedFunds = this.sortByMetric(allFunds, metric);

    // Apply pagination after sorting
    const offset = (page - 1) * limit;
    const paginatedFunds = sortedFunds.slice(offset, offset + limit);

    // Map to response format with ranks
    const rankings: LeaderboardRanking[] = paginatedFunds.map((fund, index) => ({
      rank: offset + index + 1,
      id: fund.id,
      address: fund.address,
      sequence: fund.sequence,
      managerAddress: fund.managerAddress,
      isPublic: fund.isPublic,
      tvlUsd: fund.tvlUsd.toString(),
      totalShares: fund.totalShares,
      totalMints: fund.totalMints,
      totalRedemptions: fund.totalRedemptions,
      netFlow: fund.netFlow,
      baseNav: fund.baseNav,
      sharePrice: fund.sharePrice,
      tokenAddress: fund.tokenAddress,
      lastSyncedAt: fund.lastSyncedAt.toISOString(),
    }));

    // Get last synced timestamp
    const lastSynced = await prisma.indexFund.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });

    return {
      rankings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      metadata: {
        metric,
        visibility,
        lastUpdated: lastSynced?.lastSyncedAt.toISOString() || null,
      },
    };
  }

  /**
   * Get aggregate stats for the leaderboard page
   */
  static async getStats(): Promise<LeaderboardStats> {
    const [totalFunds, publicFunds, aggregates] = await Promise.all([
      prisma.indexFund.count(),
      prisma.indexFund.count({ where: { isPublic: true } }),
      prisma.indexFund.aggregate({
        _sum: { tvlUsd: true },
      }),
    ]);

    return {
      totalFunds,
      publicFunds,
      privateFunds: totalFunds - publicFunds,
      totalTvlUsd: aggregates._sum.tvlUsd?.toString() || '0',
    };
  }

  /**
   * Sync index fund data from contracts to database
   */
  static async syncFromContracts(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const IndexFactory = new IndexFundFactoryContract.Client({
        contractId: constants.StellarConfig.INDEX_FACTORY_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      // Get all deployed index addresses
      const allIndexesResult = await IndexFactory.get_all_deployed_indexes();

      if (!allIndexesResult?.result) {
        return { synced: 0, errors: 0 };
      }

      const indexAddresses = allIndexesResult.result as string[];

      // Fetch and upsert each index
      for (let sequence = 0; sequence < indexAddresses.length; sequence++) {
        const address = indexAddresses[sequence];
        try {
          const indexClient = new IndexFundContractClient.Client({
            contractId: address,
            networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
            rpcUrl: constants.StellarConfig.RPC_URL,
          });

          const indexInfoResult = await indexClient.get_index_info();

          if (indexInfoResult?.result) {
            const info = indexInfoResult.result as IndexFundContract.IndexFundInfo;

            // Calculate derived values
            const totalShares = info.total_shares.toString();
            const totalMints = info.total_mints.toString();
            const totalRedemptions = info.total_redemptions.toString();
            const sharePrice = info.initial_price.toString();
            const baseNav = info.base_nav.toString();

            const tvlUsd = this.calculateTvl(totalShares, sharePrice);
            const netFlow = this.calculateNetFlow(totalMints, totalRedemptions);

            // Upsert to database
            await prisma.indexFund.upsert({
              where: { address },
              create: {
                address,
                sequence,
                totalShares,
                totalMints,
                totalRedemptions,
                baseNav,
                sharePrice,
                tvlUsd,
                netFlow,
                managerAddress: info.manager_address,
                isPublic: info.is_public,
                tokenAddress: info.token_address,
                lastSyncedAt: new Date(),
              },
              update: {
                sequence,
                totalShares,
                totalMints,
                totalRedemptions,
                baseNav,
                sharePrice,
                tvlUsd,
                netFlow,
                managerAddress: info.manager_address,
                isPublic: info.is_public,
                tokenAddress: info.token_address,
                lastSyncedAt: new Date(),
              },
            });

            synced++;
          }
        } catch (e) {
          console.error(`Failed to sync index ${address}:`, e);
          errors++;
        }
      }
    } catch (e) {
      console.error('Failed to sync from contracts:', e);
      throw e;
    }

    return { synced, errors };
  }

  /**
   * Calculate TVL in USD (assuming 7 decimals for Stellar)
   */
  static calculateTvl(totalShares: string, sharePrice: string): Decimal {
    try {
      const shares = BigInt(totalShares);
      const price = BigInt(sharePrice);
      const tvl = (shares * price) / BigInt(10 ** STELLAR_DECIMALS);
      return new Decimal(tvl.toString()).div(new Decimal(10 ** STELLAR_DECIMALS));
    } catch {
      return new Decimal(0);
    }
  }

  /**
   * Calculate net flow (mints - redemptions)
   */
  static calculateNetFlow(totalMints: string, totalRedemptions: string): string {
    try {
      const mints = BigInt(totalMints);
      const redemptions = BigInt(totalRedemptions);
      return (mints - redemptions).toString();
    } catch {
      return '0';
    }
  }

  /**
   * Sort funds by metric
   */
  private static sortByMetric(funds: IndexFund[], metric: LeaderboardMetric): IndexFund[] {
    return [...funds].sort((a, b) => {
      switch (metric) {
        case 'tvl':
          return b.tvlUsd.comparedTo(a.tvlUsd);
        case 'deposits':
          return this.compareBigIntStrings(b.totalMints, a.totalMints);
        case 'netFlow':
          return this.compareBigIntStrings(b.netFlow, a.netFlow);
        default:
          return b.tvlUsd.comparedTo(a.tvlUsd);
      }
    });
  }

  /**
   * Compare two BigInt strings
   */
  private static compareBigIntStrings(a: string, b: string): number {
    try {
      const bigA = BigInt(a);
      const bigB = BigInt(b);
      return bigA > bigB ? 1 : bigA < bigB ? -1 : 0;
    } catch {
      return 0;
    }
  }
}
