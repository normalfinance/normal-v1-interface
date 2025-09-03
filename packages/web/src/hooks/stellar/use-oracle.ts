'use client';

import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { OracleRegistryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  price: number | undefined;
  lastPrice: number | undefined;
  updatePrice: () => void;
  updateLastPrice: () => void;
}

// ----------------------------------------------------------------------

export function useOracle(_asset: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const storePersist = usePersistStore();

  // Config
  const [asset] = useState<string>(_asset);
  const [oracleRegistry, setOracleRegistry] = useState<OracleRegistryContract.Client | undefined>(
    undefined
  );

  const [price, setPrice] = useState<number | undefined>(undefined);
  const [lastPrice, setLastPrice] = useState<number | undefined>(undefined);

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Oracle access not allowed');
    }
  };

  const getPrice = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await rateLimitCheck();

      if (!oracleRegistry) return;

      const oraclePriceData = await oracleRegistry.get_price({
        asset,
      });

      if (oraclePriceData?.result) {
        setPrice(oraclePriceData?.result);
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const getLastPrice = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await rateLimitCheck();

      if (!oracleRegistry) return;

      const oraclePriceData = await oracleRegistry.get_last_price({
        asset,
      });

      if (oraclePriceData?.result) {
        setLastPrice(oraclePriceData?.result);
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  // On component mount, fetch OracleRegistry and price
  useEffect(() => {
    const OracleRegistry = new OracleRegistryContract.Client({
      contractId: constants.StellarConfig.ORACLE_REGISTRY_ADDRESS,
      networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      rpcUrl: constants.StellarConfig.RPC_URL,
    });
    setOracleRegistry(OracleRegistry);

    getLastPrice();
  }, [getLastPrice]);

  return {
    error,
    loading,
    price,
    lastPrice,
    updatePrice: getPrice,
    updateLastPrice: getLastPrice,
  };
}
