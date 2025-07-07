import type { xdr } from '@stellar/stellar-sdk';

import BigNumber from 'bignumber.js';
import { scValToJs, constants } from '@normalfinance/utils';
import { rpc, Contract, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';

import { scvalToBigNumber } from '../helpers/utils';

export async function useReservesScVal(poolAddress: string) {
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(poolAddress).call('get_reserves'));
  const stellar_rpc = new rpc.Server(constants.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(result)) {
    const val = scValToNative(result.result.retval);
    return {
      reserve0: val,
      reserve1: 0,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}

// ===

export function useReservesBigNumber(poolAddress: string) {
  const reservesScVal = useReservesScVal(poolAddress);

  return {
    reserve0: scvalToBigNumber(reservesScVal.reserve0ScVal),
    reserve1: scvalToBigNumber(reservesScVal.reserve1ScVal),
  };
  // }
}

export async function reservesBigNumber(poolAddress: string) {
  if (!sorobanContext.activeNetwork || !poolAddress) return;

  const reserves_scval = await contractInvoke({
    contractAddress: poolAddress,
    method: 'get_reserves',
    args: [],
    sorobanContext,
  });

  const reserves: string = scValToJs(reserves_scval as xdr.ScVal);

  return {
    reserve0: BigNumber(reserves[0]),
    reserve1: BigNumber(reserves[1]),
  };
}

export async function reservesBNWithTokens(
  poolAddress: string
) {
  const result = await reservesBigNumber(poolAddress);
  const reserve0 = result?.reserve0;
  const reserve1 = result?.reserve1;

  const token0_scval = await contractInvoke({
    contractAddress: poolAddress,
    method: 'token_0',
    args: [],
    sorobanContext,
  });
  const token0: string = scValToJs(token0_scval as xdr.ScVal);

  const token1_scval = await contractInvoke({
    contractAddress: poolAddress,
    method: 'token_1',
    args: [],
    sorobanContext,
  });
  const token1: string = scValToJs(token1_scval as xdr.ScVal);

  return {
    token0,
    reserve0,
    token1,
    reserve1,
  };
}
