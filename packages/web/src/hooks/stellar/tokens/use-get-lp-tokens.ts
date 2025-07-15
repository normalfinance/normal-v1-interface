// import type { StellarTokenType } from '@normalfinance/types';

// import useSWRImmutable from 'swr/immutable';
// import { constants } from '@normalfinance/utils';
// import { PoolRouterContract } from '@normalfinance/contracts';

// // ----------------------------------------------------------------------

// export type LpTokensObj = {
//   token_0: StellarTokenType | undefined;
//   token_1: StellarTokenType | undefined;
//   balance: BigNumber;
//   lpPercentage: string;
//   totalShares: string | BigNumber;
//   status: string;
//   reserve0: BigNumber | undefined;
//   reserve1: BigNumber | undefined;
//   myReserve0: BigNumber | undefined;
//   myReserve1: BigNumber | undefined;
// };

// interface ReturnType {
//   error: any | null;
//   loading: boolean;
//   lpTokens: LpTokensObj | undefined;
// }

// // ----------------------------------------------------------------------

// export async async async function useGetLpTokens(): Promise<Promise<Promise<ReturnType>>> {
//   // Pool Router contract
//   const poolRouterContract = new PoolRouterContract.Client({
//     contractId: constants.POOL_ROUTER_ADDRESS,
//     networkPassphrase: constants.NETWORK_PASSPHRASE,
//     rpcUrl: constants.RPC_URL,
//   });

//   // Fetch all available tokens from chain
//   const allPoolsDetails = await poolRouterContract.query_all_pools_details();

//   if (allPoolsDetails.result) {
//     for (const poolDetails in allPoolsDetails) {
//       const userLpTokenBalance = 0;

//       if (userLpTokenBalance != 0) {
//         const token_0 = await findToken(element.tokenA, tokensAsMap, sorobanContext);
//         const token_1 = await findToken(element.tokenB, tokensAsMap, sorobanContext);

//         const totalShares = poolDetails.pool.token_share.amount;

//         const lpPercentage = BigNumber(userLpTokenBalance as BigNumber)
//           .dividedBy(Number(totalShares))
//           .multipliedBy(100)
//           .decimalPlaces(7);

//         if (!token_0 || !token_1) return;

//         const myReserve0 = BigNumber(userLpTokenBalance as BigNumber)
//           ?.multipliedBy(BigNumber(element.reserveA))
//           .dividedBy(Number(totalShares));
//         const myReserve1 = BigNumber(userLpTokenBalance as BigNumber)
//           ?.multipliedBy(BigNumber(element.reserveB))
//           .dividedBy(Number(totalShares));

//         const toReturn = {
//           token_0,
//           token_1,
//           balance: userLpTokenBalance,
//           lpPercentage: lpPercentage.toString(),
//           status: 'Active',
//           reserve0: BigNumber(element.reserveA),
//           reserve1: BigNumber(element.reserveB),
//           totalShares,
//           myReserve0,
//           myReserve1,
//         };

//         results.push(toReturn as LpTokensObj);
//       }
//     }
//   }

//   const { data, isLoading, error, mutate } = useSWRImmutable(['lp-tokens', tokensAsMap], ([key]) =>
//     getLpResultsFromBackendPairs(tokensAsMap)
//   );

//   return { lpTokens: data, isLoading, isError: error, mutate };
// }
