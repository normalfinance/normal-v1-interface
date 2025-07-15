'use client';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { OracleRegistryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  price: number | undefined;
  lastPrice: number | undefined;
  updatePrice: (cached: boolean) => void;
  updateLastPrice: () => void;
}

// ----------------------------------------------------------------------

export function useOracle(_asset: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  // Config
  const [asset] = useState<string>(_asset);
  const [oracleRegistry, setOracleRegistry] = useState<OracleRegistryContract.Client | undefined>(
    undefined
  );

  const [price, setPrice] = useState<number | undefined>(undefined);
  const [lastPrice, setLastPrice] = useState<number | undefined>(undefined);

  const defaultAction: OracleRegistryContract.NormalAction = {
    tag: 'UpdateTwap',
    values: undefined,
  };

  const getPrice = useCallback(async (cached: boolean) => {
    try {
      setError(null);
      setLoading(true);

      if (!oracleRegistry) return;

      const oraclePriceData = await oracleRegistry.get_price({
        asset,
        cached,
        action: defaultAction,
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
      contractId: constants.ORALCE_REGISTY_ADDRESS,
      networkPassphrase: constants.NETWORK_PASSPHRASE,
      rpcUrl: constants.RPC_URL,
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
