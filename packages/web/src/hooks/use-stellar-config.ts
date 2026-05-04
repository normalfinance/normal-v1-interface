import { useNetworkStore } from '@normalfinance/state';
import { getStellarConfigForNetwork } from '@normalfinance/utils';

/**
 * Returns the Stellar NetworkConfig that matches the user's currently selected
 * network (mainnet / testnet). Reactively re-renders whenever the network is toggled.
 */
export function useStellarConfig() {
  const network = useNetworkStore((s) => s.network);
  return getStellarConfigForNetwork(network);
}
