import { LongShortPairContract, LongShortPairFactoryContract } from '@normalfinance/contracts';
import { AppStorePersist, PairActions, Pair, PairState } from '@normalfinance/types';
import { constants, format, logger } from '@normalfinance/utils';
import { usePersistStore } from '../store';
import { BigNumber } from 'bignumber.js';

async function getPairDetails(pairAddress: string) {
  const PairClient = new LongShortPairContract.Client({
    contractId: pairAddress,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const pairSummaryResponse = await PairClient.get_pair_summary();

  if (!pairSummaryResponse || !pairSummaryResponse.result) return;

  let pairSummary = pairSummaryResponse.result as LongShortPairContract.PairSummary;

  // Compute scaled price
  let lowerPriceBound = pairSummary.price_bounds[0];
  let upperPriceBound = pairSummary.price_bounds[1];

  const priceBoundaryDelta = BigNumber(upperPriceBound).minus(lowerPriceBound);
  const scaledPrice = BigNumber(pairSummary.collateral.collateral_percent_long)
    .multipliedBy(priceBoundaryDelta)
    .plus(lowerPriceBound);

  const pairDetails: Pair = {
    pairAddress,
    asset: pairSummary.asset,
    status: pairSummary.status,
    tokens: {
      long: pairSummary.long_token,
      short: pairSummary.short_token,
    },
    collateral: {
      collateralToken: pairSummary.collateral.collateral_token,
      collateralPerPair: BigNumber(
        format.fTokenAmount(pairSummary.collateral.collateral_per_pair, 7)
      ).toString(),
      collateralPercentLong: BigNumber(
        format.fTokenAmount(pairSummary.collateral.collateral_percent_long, 7)
      ).toString(),
      totalCollateral: BigNumber(
        format.fTokenAmount(pairSummary.collateral.total_collateral, 7)
      ).toString(),
    },
    scaledPrice: format.fTokenAmount(scaledPrice, 14).toString(),
    priceBounds: {
      lower: BigNumber(format.fTokenAmount(lowerPriceBound, 7)).toString(),
      upper: BigNumber(format.fTokenAmount(upperPriceBound, 7)).toString(),
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
        // const lastFetched = usePersistStore.getState().pairState.lastUpdated;
        // const refreshInterval = 1000 * 60 * 5; // 5 minutes

        // if (lastFetched && now - lastFetched < refreshInterval) {
        //   return;
        // }

        // TODO: add rate limiter

        const getAllDeployedPairsResponse = await LongShortPairFactory.get_all_deployed_pairs();

        // No pair found
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
            acc[pair.tokens.long] = pair;
            acc[pair.tokens.short] = pair;
            return acc;
          },
          {}
        );

        // Map pairs by their address
        const pairByAddress = pairsFiltered.reduce<Record<string, Pair>>(
          (acc: Record<string, Pair>, pair: Pair) => {
            acc[pair.pairAddress] = pair;
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
        const pair = pairs.find((p) => p.pairAddress === pairAddress);

        if (!pairs || !pairs.length || !pair) {
          return;
        }

        const pairDetails = await getPairDetails(pair.pairAddress);

        // Update the state
        usePersistStore.setState((state: AppStorePersist) => {
          const updatedPairs = state.pairState.pairs.map((existingPair) =>
            existingPair.pairAddress === pairAddress ? pairDetails : existingPair
          );

          // Safely remove all undefined values
          const pairsFiltered = updatedPairs.filter(
            (r): r is NonNullable<typeof r> => r !== undefined && r !== null
          );

          // Map pairs by their tokens
          const pairByToken = pairsFiltered.reduce<Record<string, Pair>>((acc, pair) => {
            acc[pair.tokens.long] = pair;
            acc[pair.tokens.short] = pair;
            acc[pair.pairAddress] = pair;
            return acc;
          }, {});

          // Map pairs by their address
          const pairByAddress = pairsFiltered.reduce<Record<string, Pair>>((acc, pair) => {
            acc[pair.pairAddress] = pair;
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
