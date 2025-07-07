'use client';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { OracleRegistryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  getPrice: (asset: string, cached: boolean) => Promise<OracleRegistryContract.OraclePriceData>;
  getLastPrice: (
    asset: string,
    cached: boolean
  ) => Promise<OracleRegistryContract.HistoricalOracleData>;
  getOracle: (asset: string) => Promise<OracleRegistryContract.OracleInfo>;
}

// ----------------------------------------------------------------------

export function useOracle(): ReturnType {
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const getPrice = useCallback(async (asset: string, cached: boolean) => {
    try {
      setError(null);
      setLoading(true);

      const OracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.ORALCE_REGISTY_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const oraclePriceData = await OracleRegistry.get_price({
        asset,
        cached,
        action: '',
      });

      if (oraclePriceData?.result) {
        return;
      }
    } catch (e) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  const getLastPrice = useCallback(async (asset: string, cached: boolean) => {
    try {
      setError(null);
      setLoading(true);

      const OracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.ORALCE_REGISTY_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const oraclePriceData = await OracleRegistry.get_last_price({
        asset,
        cached,
      });

      if (oraclePriceData?.result) {
        return oraclePriceData.result;
      }
    } catch (e) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return undefined;
  }, []);

  const getOracle = useCallback(async (asset: string) => {
    try {
      setError(null);
      setLoading(true);

      const OracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.ORALCE_REGISTY_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const oracle = await OracleRegistry.get_oracle({
        asset,
      });

      if (oracle?.result) {
        return oracle.result;
      }
    } catch (e) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return undefined;
  }, []);

  return {
    error,
    loading,
    getPrice,
    getLastPrice,
    getOracle,
  };
}
