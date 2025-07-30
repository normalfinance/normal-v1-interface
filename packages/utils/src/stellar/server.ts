import { Horizon } from '@stellar/stellar-sdk';
import { StellarConfig } from '../constants';

/**
 * SorobanClient.Server instance, initialized using {@link RPC_URL} used to
 * initialize this library.
 */
export const Server = new Horizon.Server(StellarConfig.RPC_URL, {
  allowHttp: StellarConfig.RPC_URL.startsWith('http://'),
});
