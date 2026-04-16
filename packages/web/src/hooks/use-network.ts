import { useCallback, useEffect, useState } from 'react';

import { getCurrentNetwork, NetworkType } from '@normalfinance/utils';

const STORAGE_KEY = 'normal.network';

function getInitialNetwork(): NetworkType {
  if (typeof window === 'undefined') {
    // SSR: fall back to env var
    return getCurrentNetwork();
  }
  const stored = localStorage.getItem(STORAGE_KEY) as NetworkType | null;
  if (stored === 'mainnet' || stored === 'testnet') {
    return stored;
  }
  return getCurrentNetwork();
}

export function useNetwork() {
  const [network, setNetwork] = useState<NetworkType>(getInitialNetwork);

  // Sync to localStorage whenever the network changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, network);
    }
  }, [network]);

  const toggleNetwork = useCallback(() => {
    setNetwork((prev) => (prev === 'mainnet' ? 'testnet' : 'mainnet'));
  }, []);

  return {
    network,
    toggleNetwork,
    isMainnet: network === 'mainnet',
  };
}
