'use client';

import type { Pair } from '@normalfinance/types';
import type { TreasuryUserPairSummary } from '@normalfinance/contracts/build/treasury';

import { BigNumber } from 'bignumber.js';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { TreasuryContract } from '@normalfinance/contracts';
import {
  logger,
  format,
  constants,
  getTokenBalance,
  convertCoinToFiat,
} from '@normalfinance/utils';

// ----------------------------------------------------------------------

export type LiquidityPosition = {
  pair: Pair;

  totalShares: BigNumber;
  userShares: BigNumber;
  userSharePercentage: BigNumber;

  balances: {
    tokenLong: BigNumber;
    tokenShort: BigNumber;
    tokenUSDC: BigNumber;
    reward: BigNumber;
  };
  usdValues: {
    tokenLong: string;
    tokenShort: string;
    tokenUSDC: string;
    reward: BigNumber;
  };
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  liquidityPositions: LiquidityPosition[] | undefined;
  fetchPositions: () => void;
}

// ----------------------------------------------------------------------

export function useLiquidityPositions(): ReturnType {
  const {
    wallet,
    tokenState: { tokens, tokensByAddress },
    pairState: { pairs },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<LiquidityPosition[] | undefined>(undefined);

  // Fetch info from Treasury
  const TreasuryClient = new TreasuryContract.Client({
    contractId: constants.StellarConfig.TREASURY_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const tokenUSDC = tokensByAddress[constants.StellarConfig.USDC_ADDRESS];

  const fetchPositionDetails = async (pair: Pair): Promise<LiquidityPosition | undefined> => {
    if (!wallet.address) {
      return undefined;
    }

    const userPairSummaryResponse = await TreasuryClient.get_user_with_pair_summary({
      pair: pair.addresses.pair,
      user: wallet.address,
    });

    if (userPairSummaryResponse && userPairSummaryResponse.result) {
      const { pair_summary, user_shares } =
        userPairSummaryResponse.result as TreasuryUserPairSummary;

      // Shares info
      const userShares = BigNumber(format.fTokenAmount(user_shares, 7));
      const totalShares = BigNumber(format.fTokenAmount(pair_summary.total_shares, 7));
      const userSharePercentage = userShares.dividedBy(totalShares);

      const tokenLong = tokensByAddress[pair.addresses.tokenLong];
      const tokenShort = tokensByAddress[pair.addresses.tokenShort];

      // Rewards
      const claimableReward = BigNumber(0);

      const liquidityPosition: LiquidityPosition = {
        pair,

        userShares,
        totalShares,
        userSharePercentage,

        balances: {
          tokenLong: pair_summary.balances.token_long,
          tokenShort: pair_summary.balances.token_short,
          tokenUSDC: pair_summary.balances.token_quote,
          reward: claimableReward,
        },
        usdValues: {
          tokenLong: convertCoinToFiat(
            pair_summary.balances.token_long,
            BigNumber(tokenLong.price)
          ),
          tokenShort: convertCoinToFiat(
            pair_summary.balances.token_short,
            BigNumber(tokenShort.price)
          ),
          tokenUSDC: convertCoinToFiat(
            pair_summary.balances.token_quote,
            BigNumber(tokenUSDC.price)
          ),
          reward: claimableReward,
        },
      };

      return liquidityPosition;
    }

    return undefined;
  };

  const fetchPositions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      if (pairs.length) {
        const liquidityPositions = await Promise.all(
          pairs.map(async (pair) => await fetchPositionDetails(pair))
        );

        // Safely remove all undefined values
        const liquidityPositionsFiltered = liquidityPositions.filter(
          (r): r is NonNullable<typeof r> => r !== undefined && r !== null
        );

        setPositions(liquidityPositionsFiltered as LiquidityPosition[]);
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return;
  }, []);

  // On component mount, fetch positions
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions, pairs]);

  return {
    error,
    loading,
    liquidityPositions: positions,
    fetchPositions,
  };
}

const fetchTokenBalance = async (tokenAddress: string, address: string): Promise<BigNumber> => {
  let balance = BigNumber(0);
  try {
    const rawBalance = await getTokenBalance(tokenAddress, address);
    balance = BigNumber(rawBalance);
  } catch (error) {
    logger.warn('[WALLET ACTIONS] Error getting API token balance:', error);
  }
  return balance;
};
