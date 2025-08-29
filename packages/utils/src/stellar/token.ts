//! Utilities for interacting with token contracts

import { rpc, Contract, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';
import { addressToScVal, constants, scValToJs } from '..';

export const getTokenName = async (tokenAddress: string): Promise<string> => {
  const tx_builder = new TransactionBuilder(constants.StellarConfig.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('name'));

  const stellarRpc = new rpc.Server(constants.StellarConfig.RPC_URL);

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

export const getTokenSymbol = async (tokenAddress: string): Promise<string> => {
  const tx_builder = new TransactionBuilder(constants.StellarConfig.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('symbol'));

  const stellarRpc = new rpc.Server(constants.StellarConfig.RPC_URL);

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

export const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
  const tx_builder = new TransactionBuilder(constants.StellarConfig.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('decimals'));

  const stellarRpc = new rpc.Server(constants.StellarConfig.RPC_URL);

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

export async function getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {
  const user = addressToScVal(address);

  const tx_builder = new TransactionBuilder(constants.StellarConfig.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('balance', user));

  const stellarRpc = new rpc.Server(constants.StellarConfig.RPC_URL);

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
