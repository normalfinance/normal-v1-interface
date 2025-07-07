import { constants } from '@normalfinance/utils';
import { rpc, Contract, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';

export async function getTotalLpTokens(
  pool_address: string
): Promise<{ total_shares: number; latestLedger: number }> {
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });

  tx_builder.addOperation(new Contract(pool_address).call('get_total_shares'));

  const stellar_rpc = new rpc.Server(constants.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());

  if (rpc.Api.isSimulationSuccess(result)) {
    const val = scValToNative(result.result.retval);
    return {
      total_shares: val,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}
