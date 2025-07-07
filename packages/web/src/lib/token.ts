//! Utilities for interacting with token contracts

import type { Address } from '@stellar/stellar-sdk';

import { constants } from '@normalfinance/utils';
import { rpc, Account, Contract, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';


/**
 * Fetch the token balance for a given address
 *
 * @param token_id - The token contract address
 * @param address - The address to fetch the balance for
 * @returns - The balance
 */
export async function getTokenBalance(token_id: string, address: Address): Promise<bigint> {
  // account does not get validated during simulateTx
  const account = new Account('GANXGJV2RNOFMOSQ2DTI3RKDBAVERXUVFC27KW3RLVQCLB3RYNO3AAI4', '123');
  const tx_builder = new TransactionBuilder(account, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(token_id).call('balance', address.toScVal()));
  const stellarRpc = new rpc.Server(constants.RPC_URL, network.opts);
  const scval_result: rpc.Api.SimulateTransactionResponse = await stellarRpc.simulateTransaction(
    tx_builder.build()
  );
  if (scval_result == undefined) {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
  if (rpc.Api.isSimulationSuccess(scval_result)) {
    const val = scValToNative(scval_result.result.retval);
    return val;
  } else {
    throw Error(`unable to fetch balance for token: ${token_id}`);
  }
}
