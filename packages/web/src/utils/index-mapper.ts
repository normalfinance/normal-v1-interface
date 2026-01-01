import type { IndexFundContract } from '@normalfinance/contracts';
import type { IndexDetails, WeightingStrategy } from '@normalfinance/types';

/**
 * Maps IndexContract.IndexInfo from on-chain to a partial IndexDetails format for UI.
 */
export function mapIndexInfoToDetails(
  info: IndexFundContract.IndexFundInfo,
  address: string,
  sequence: number
): Partial<IndexDetails> {
  return {
    id: sequence,
    name: `Index #${sequence}`,
    slug: address,
    description: info.is_public ? 'Public index fund' : 'Private index fund',
    creationDate: new Date().toISOString(),
    updatedAt: info.last_updated_ts
      ? new Date(Number(info.last_updated_ts) * 1000).toISOString()
      : new Date().toISOString(),
    weighting: {
      type: 'CUSTOM',
      label: 'Custom',
      description: 'Custom weighting strategy',
    } as WeightingStrategy,
    constituents: [],
  };
}

/**
 * Converts bigint values from contract to human-readable numbers
 */
export function formatContractAmount(amount: bigint, decimals: number = 7): number {
  return Number(amount) / 10 ** decimals;
}

/**
 * Creates a display-friendly index summary from contract info
 */
export interface IndexSummary {
  address: string;
  sequence: number;
  isPublic: boolean;
  managerAddress: string;
  tokenAddress: string;
  totalShares: number;
  totalDeposits: number;
  totalWithdrawals: number;
  baseNav: number;
  sharePrice: number;
  accumulatedFees: number;
  lastRebalanceDate: Date | null;
  lastUpdatedDate: Date | null;
}

export function createIndexSummary(
  info: IndexFundContract.IndexFundInfo,
  address: string,
  sequence: number
): IndexSummary {
  return {
    address,
    sequence,
    isPublic: info.is_public,
    managerAddress: info.manager_address,
    tokenAddress: info.token_address,
    totalShares: formatContractAmount(info.total_shares),
    totalDeposits: formatContractAmount(info.total_mints),
    totalWithdrawals: formatContractAmount(info.total_redemptions),
    baseNav: formatContractAmount(info.base_nav),
    sharePrice: formatContractAmount(info.initial_price),
    accumulatedFees: formatContractAmount(BigInt(0)), // This is a placeholder, we need to get rid of fees later
    lastRebalanceDate: info.last_rebalance_ts
      ? new Date(Number(info.last_rebalance_ts) * 1000)
      : null,
    lastUpdatedDate: info.last_updated_ts ? new Date(Number(info.last_updated_ts) * 1000) : null,
  };
}

/**
 * Formats an index status for display
 */
export function getIndexStatusLabel(info: IndexFundContract.IndexFundInfo): string {
  if (!info.is_public) {
    return 'Private';
  }
  return 'Active';
}

/**
 * Gets status color for UI
 */
export function getIndexStatusColor(
  info: IndexFundContract.IndexFundInfo
): 'success' | 'warning' | 'error' | 'info' {
  if (!info.is_public) {
    return 'info';
  }
  return 'success';
}
