import {
  rpc,
  xdr,
  Contract,
  scValToNative,
  TransactionBuilder,
  Address,
  Account,
} from '@stellar/stellar-sdk';
import { constants } from '..';

export interface PriceData {
  price: bigint;
  timestamp: number;
}

const TESTING_SOURCE = new Account(
  'GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO',
  '123'
);

export async function getReflectorExternalPrice(tokenSymbol: string): Promise<PriceData> {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });

  const asset = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Other'), xdr.ScVal.scvSymbol(tokenSymbol)]);

  tx_builder.addOperation(
    new Contract(constants.StellarConfig.REFLECTOR_EXTERNAL_ORACLE_ADDRESS).call('lastprice', asset)
  );

  const stellar_rpc = new rpc.Server(constants.StellarConfig.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());

  if (rpc.Api.isSimulationSuccess(result)) {
    const xdr_str = result.result?.retval.toXDR('base64');
    if (xdr_str) {
      const price_result: any = xdr.ScVal.fromXDR(xdr_str, 'base64')?.value();
      if (price_result) {
        return {
          // eslint-disable-next-line
          // @ts-ignore
          price: scValToNative(price_result[0]?.val()),
          timestamp: Number(scValToNative(price_result[1]?.val())),
        };
      }
    }
    throw new Error('Unable to decode oracle price result');
  } else {
    throw new Error(`Failed to fetch oralce price: ${result.error}`);
  }
}

export async function getReflectorPubnetPrice(tokenAddress: string): Promise<PriceData> {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });

  const asset = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Stellar'),
    Address.fromString(tokenAddress).toScVal(),
  ]);

  tx_builder.addOperation(
    new Contract(constants.StellarConfig.REFLECTOR_PUBNET_ORACLE_ADDRESS).call('lastprice', asset)
  );

  const stellar_rpc = new rpc.Server(constants.StellarConfig.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());

  if (rpc.Api.isSimulationSuccess(result)) {
    const xdr_str = result.result?.retval.toXDR('base64');
    if (xdr_str) {
      const price_result: any = xdr.ScVal.fromXDR(xdr_str, 'base64')?.value();
      if (price_result) {
        return {
          // eslint-disable-next-line
          // @ts-ignore
          price: scValToNative(price_result[0]?.val()),
          timestamp: Number(scValToNative(price_result[1]?.val())),
        };
      }
    }
    throw new Error('Unable to decode oracle price result');
  } else {
    throw new Error(`Failed to fetch oralce price: ${result.error}`);
  }
}

export async function getOracleDecimals(
  oracle_id: string
): Promise<{ decimals: number; latestLedger: number }> {
  const tx_builder = new TransactionBuilder(TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(oracle_id).call('decimals'));

  const stellar_rpc = new rpc.Server(constants.StellarConfig.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());

  if (rpc.Api.isSimulationSuccess(result)) {
    const val = scValToNative((result as any).result.retval);
    return {
      decimals: val,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}
