import { LongShortPairContract, LongShortPairFactoryContract } from '@normalfinance/contracts';
import { AppStorePersist, PairActions, Pair, PairState } from '@normalfinance/types';
import { constants, format, logger, sortTokenAddreses } from '@normalfinance/utils';
import { usePersistStore } from '../store';
import { BigNumber } from 'bignumber.js';

async function getPairDetails(pairAddress: string) {
  const PairClient = new LongShortPairContract.Client({
    contractId: pairAddress,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const pairSummaryResponse = await PairClient.get_pair_summary();

  if (!pairSummaryResponse || !pairSummaryResponse.length) return;
  let pairSummary = pairSummaryResponse.result as LongShortPairContract.PairSummary;

  const pairDetails: Pair = {
    version: 'v1',
    addresses: {
      pair: pairAddress,
      tokenLong: '',
      tokenShort: '',
    },
    collateral: {
      perPair: BigNumber(
        format.fTokenAmount(pairSummary.collateral.collateral_per_pair, 7)
      ).toString(),
      percentLong: BigNumber(
        format.fTokenAmount(pairSummary.collateral.collateral_percent_long, 7)
      ).toString(),
      amount: BigNumber(format.fTokenAmount(0, 7)).toString(), // pairSummary.collateral.total_collateral
    },
    client: PairClient,
  };

  return pairDetails;
}

export function createPairActions(): PairActions {
  const initialState: PairState = {
    pairs: [],
    pairByToken: {},
    pairByAddress: {},
    lastUpdated: 0,
  };

  const LongShortPairFactory = new LongShortPairFactoryContract.Client({
    contractId: constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  return {
    pairState: initialState,

    getAllPairs: async () => {
      try {
        const now = Date.now();
        const lastFetched = usePersistStore.getState().pairState.lastUpdated;
        const refreshInterval = 1000 * 60 * 5; // 5 minutes

        if (lastFetched && now - lastFetched < refreshInterval) {
          return;
        }

        // TODO: add rate limiter

        const getAllDeployedPairsResponse = await LongShortPairFactory.get_all_deployed_pairs();
        console.log(getAllDeployedPairsResponse);

        // No pools found
        if (!getAllDeployedPairsResponse || !getAllDeployedPairsResponse.result) return;

        const pairAddresses = getAllDeployedPairsResponse.result as string[];

        const pairs = await Promise.all(
          pairAddresses.map(async (pairAddress) => {
            return await getPairDetails(pairAddress);
          })
        );

        // Safely remove all undefined values
        const pairsFiltered = pairs.filter(
          (r: Pair | undefined): r is NonNullable<typeof r> => r !== undefined && r !== null
        );

        // Map pairs by their tokens
        const pairByToken = pairsFiltered.reduce<Record<string, Pair>>(
          (acc: Record<string, Pair>, pair: Pair) => {
            acc[pair.addresses.tokenLong] = pair;
            acc[pair.addresses.tokenShort] = pair;
            return acc;
          },
          {}
        );

        // Map pairs by their address
        const pairByAddress = pairsFiltered.reduce<Record<string, Pair>>(
          (acc: Record<string, Pair>, pair: Pair) => {
            acc[pair.addresses.pair] = pair;
            return acc;
          },
          {}
        );

        const newState: PairState = {
          pairs: pairsFiltered,
          pairByToken,
          pairByAddress,
          lastUpdated: now,
        };

        // Update the state
        usePersistStore.setState((state: AppStorePersist) => ({
          ...state,
          pairState: newState,
        }));
      } catch (error) {
        logger.error('Failed to get all pairs:', error);
      }
    },

    getPair: async (pairAddress: string) => {
      try {
        const pairs = usePersistStore.getState().pairState.pairs;
        const pair = pairs.find((p) => p.addresses.pair === pairAddress);

        if (!pairs || !pairs.length || !pair) {
          return;
        }

        const pairDetails = await getPairDetails(pair.addresses.pair);

        // Update the state

        usePersistStore.setState((state: AppStorePersist) => {
          const updatedPairs = state.pairState.pairs.map((existingPool) =>
            existingPool.addresses.pair === pairAddress ? pairDetails : existingPool
          );

          // Safely remove all undefined values
          const pairsFiltered = updatedPairs.filter(
            (r): r is NonNullable<typeof r> => r !== undefined && r !== null
          );

          // Map pairs by their tokens
          const pairByToken = pairsFiltered.reduce<Record<string, Pair>>((acc, pool) => {
            const { tokens: sortedTokens } = sortTokenAddreses(
              pool.addresses.tokenLong,
              pool.addresses.tokenShort
            );
            const key = sortedTokens.join(':');
            acc[key] = pool;
            return acc;
          }, {});

          // Map pairs by their tokens
          const pairByAddress = pairsFiltered.reduce<Record<string, Pair>>((acc, pair) => {
            acc[pair.addresses.pair] = pair;
            return acc;
          }, {});

          const newState: PairState = {
            pairs: pairsFiltered,
            pairByToken,
            pairByAddress,
            lastUpdated: Date.now(),
          };

          return {
            ...state,
            pairState: newState,
          };
        });
      } catch (error) {
        logger.error('Error updating pair:', error);
        return;
      }
    },
  };
}
