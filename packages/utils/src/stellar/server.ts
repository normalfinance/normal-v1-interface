import { Horizon, rpc } from '@stellar/stellar-sdk';
import { StellarConfig } from '../constants';

/**
 * SorobanClient.Server instance, initialized using {@link RPC_URL} used to
 * initialize this library.
 */
export const horizonServer = new Horizon.Server(StellarConfig.HORIZON_URL, {
  allowHttp: StellarConfig.HORIZON_URL.startsWith('http://'),
});

export const rpcServer = new rpc.Server(StellarConfig.RPC_URL, {
  allowHttp: StellarConfig.RPC_URL.startsWith('http://'),
});
