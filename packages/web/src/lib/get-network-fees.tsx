import type { InterfaceTrade } from 'state/routing/types';

import { constants } from '@normalfinance/utils';
import * as StellarSdk from '@stellar/stellar-sdk';
import { contractTransaction } from 'stellar-react';

const getCurrentTimePlusOneHour = (): number => {
  // Get the current time in milliseconds
  const now = Date.now();

  // Add one hour (3600000 milliseconds)
  const oneHourLater = now + 36000000;

  const oneHourLaterSeconds = Math.floor(oneHourLater / 1000);
  return oneHourLaterSeconds;
};

export async function calculateSwapFees(trade: InterfaceTrade | undefined) {
  if (!trade) {
    console.error('Trade data is not available.');
    return;
  }

  const adminPublicKey = process.env.NEXT_PUBLIC_TRUSTLINE_WALLET_PUBLIC_KEY;

  if (!adminPublicKey) {
    console.error('No secret key found.');
    return;
  }

  const path = trade.path?.map((address) => new StellarSdk.Address(address));
  const scValParams = [
    StellarSdk.nativeToScVal(Number(trade.inputAmount?.value), { type: 'i128' }),
    StellarSdk.nativeToScVal(Number(trade.outputAmount?.value), { type: 'i128' }),
    StellarSdk.nativeToScVal(path, { type: 'Vec' }),
    new StellarSdk.Address(adminPublicKey).toScVal(),
    StellarSdk.nativeToScVal(getCurrentTimePlusOneHour(), { type: 'u64' }),
  ];

  const server = new StellarSdk.rpc.Server(sorobanServer.serverURL, {
    allowHttp: true,
  });

  const account = await server.getAccount(adminPublicKey);

  const txn = contractTransaction({
    networkPassphrase: constants.NETWORK_PASSPHRASE,
    source: account,
    contractAddress: constants.POOL_ROUTER_ADDRESS,
    method: op,
    args: scValParams,
  });

  const simulated: StellarSdk.rpc.Api.SimulateTransactionResponse =
    await server?.simulateTransaction(txn);

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(simulated.error);
  } else if (!simulated.result) {
    throw new Error(`invalid simulation: no result in ${simulated}`);
  }

  return simulated.minResourceFee;
}

export async function calculateLiquidityFees(
  args: any,
  op: RouterMethod
) {
 


  const adminPublicKey = process.env.NEXT_PUBLIC_TRUSTLINE_WALLET_PUBLIC_KEY;
  if (!adminPublicKey) {
    console.error('No secret key found.');
    return;
  }
  const sorobanRpcUrl = sorobanContext.sorobanServer.serverURL;

  const server = new StellarSdk.rpc.Server(sorobanRpcUrl, {
    allowHttp: true,
  });

  const account = await server.getAccount(adminPublicKey);

  const txn = contractTransaction({
    networkPassphrase: passphrase,
    source: account,
    contractAddress: constants.POOL_ROUTER_ADDRESS,
    method: op,
    args,
  });

  const simulated: StellarSdk.rpc.Api.SimulateTransactionResponse =
    await server?.simulateTransaction(txn);

  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    console.error(simulated.error);
    return;
  } else if (!simulated.result) {
    console.error(`invalid simulation: no result in ${simulated}`);
    return;
  }

  return simulated.minResourceFee;
}
