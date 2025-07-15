//! Utilities for interacting with token contracts

import type { StateToken as Token } from '@normalfinance/types';

import { rpc, Contract, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';
import { constants , scValToJs, isAddress, addressToScVal, getCryptoIconUrl } from '@normalfinance/utils';

export async function getToken(tokenAddress?: string | undefined): Promise<Token | undefined> {
  if (!tokenAddress || tokenAddress === '') return undefined;

  let name, symbol, decimals, logo;

  try {
    const formattedAddress = isAddress(tokenAddress);
    if (!formattedAddress) return;
    name = await getTokenName(formattedAddress);
    symbol = await getTokenSymbol(formattedAddress);
    decimals = await getTokenDecimals(formattedAddress);
    logo = await getCryptoIconUrl(symbol);

    const token: Token = {
      contract: formattedAddress,
      name: name as string,
      code: symbol as string,
      decimals,
      icon: logo,
    };

    return token;
  } catch (error) {
    console.log('🚀 « error:', error);
  }
}

export const getTokenName = async (tokenAddress: string): Promise<string> => {
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('name'));

  const stellarRpc = new rpc.Server(constants.RPC_URL);

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
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('symbol'));

  const stellarRpc = new rpc.Server(constants.RPC_URL);

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
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('decimals'));

  const stellarRpc = new rpc.Server(constants.RPC_URL);

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

  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('balance', user));

  const stellarRpc = new rpc.Server(constants.RPC_URL);

  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch balance for token: ${tokenAddress}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch balance for token: ${tokenAddress}`);
  }
}
