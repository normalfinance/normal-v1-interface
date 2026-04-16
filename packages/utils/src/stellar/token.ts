//! Utilities for interacting with token contracts

import { rpc, Contract, scValToNative, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { NetworkConfig } from '@normalfinance/types';
import { addressToScVal, constants, scValToJs } from '..';

const TESTING_SOURCE = new Account(
  'GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO',
  '123'
);

export const getTokenName = async (
  tokenAddress: string,
  config: NetworkConfig = constants.StellarConfig
): Promise<string> => {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: config.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('name'));

  const stellarRpc = new rpc.Server(config.RPC_URL);

  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch name for token: ${tokenAddress}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result) && scval_result.result?.retval) {
    const val = scValToJs<string>(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch name for token: ${tokenAddress}`);
  }
};

export const getTokenSymbol = async (
  tokenAddress: string,
  config: NetworkConfig = constants.StellarConfig
): Promise<string> => {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: config.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('symbol'));

  const stellarRpc = new rpc.Server(config.RPC_URL);

  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch symbol for token: ${tokenAddress}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result) && scval_result.result?.retval) {
    const val = scValToJs<string>(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch symbol for token: ${tokenAddress}`);
  }
};

export const getTokenDecimals = async (
  tokenAddress: string,
  config: NetworkConfig = constants.StellarConfig
): Promise<number> => {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: config.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('decimals'));

  const stellarRpc = new rpc.Server(config.RPC_URL);

  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch decimals for token: ${tokenAddress}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result) && scval_result.result?.retval) {
    const val = scValToJs<number>(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch decimals for token: ${tokenAddress}`);
  }
};

export async function getTokenBalance(
  tokenAddress: string,
  address: string,
  config: NetworkConfig = constants.StellarConfig
): Promise<bigint> {
  const user = addressToScVal(address);

  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: config.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('balance', user));

  const stellarRpc = new rpc.Server(config.RPC_URL);

  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch balance for token: ${tokenAddress}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative((scval_result as any).result.retval);
    return val;
  } else {
    throw Error(`unable to fetch balance for token: ${tokenAddress}`);
  }
}
