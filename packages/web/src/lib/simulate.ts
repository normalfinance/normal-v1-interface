import { constants } from '@normalfinance/utils';
import {
  rpc,
  xdr,
  Account,
  BASE_FEE,
  TimeoutInfinite,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

export async function simulateAndParse<T>(
  operation: string,
  parser: (result: string) => T
): Promise<{ result: T; latestLedger: number }> {
  const stellarRpc = new rpc.Server(constants.RPC_URL, network.opts);
  const account = new Account('GDMVSPSKEUOTRFSJH2SXVUNB2JGORKDTWBMOP5OZJZP4GKRQUQWFJO4Y', '123');
  const txBuilder = new TransactionBuilder(account, {
    networkPassphrase: constants.NETWORK_PASSPHRASE,
    fee: BASE_FEE,
    timebounds: { maxTime: TimeoutInfinite, minTime: 0 },
  }).addOperation(xdr.Operation.fromXDR(operation, 'base64'));
  const transaction = txBuilder.build();
  const simulation = await stellarRpc.simulateTransaction(transaction);
  if (rpc.Api.isSimulationSuccess(simulation) && simulation.result.retval) {
    return {
      result: parser(simulation.result.retval.toXDR('base64')),
      latestLedger: simulation.latestLedger,
    };
  }
}
