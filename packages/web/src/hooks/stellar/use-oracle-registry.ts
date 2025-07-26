'use client';

import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { OracleRegistryContract } from '@normalfinance/contracts';

interface ReturnType {
  error: any | null;
  loading: boolean;
  oracleRegistry: OracleRegistryContract.Client | undefined;
  getPrice: (asset: string, cached: boolean) => Promise<OracleRegistryContract.OraclePriceData>;
  getLastPrice: (
    asset: string,
    cached: boolean
  ) => Promise<OracleRegistryContract.HistoricalOracleData>;
  getOracle: (asset: string) => Promise<OracleRegistryContract.OracleInfo>;
}

export function useOracleRegistry(): ReturnType {
  const [oracleRegistry, setOracleRegistry] = useState<OracleRegistryContract.Client | undefined>(
    undefined
  );

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const storePersist = usePersistStore();

  const defaultAction: OracleRegistryContract.NormalAction = {
    tag: 'UpdateTwap',
    values: undefined,
  };

  const fetchOracleRegistry = useCallback(() => {
    try {
      setError(null);
      setLoading(true);

      if (!oracleRegistry) {
        const OracleRegistry = new OracleRegistryContract.Client({
          contractId: constants.ORALCE_REGISTY_ADDRESS,
          networkPassphrase: constants.NETWORK_PASSPHRASE,
          rpcUrl: constants.RPC_URL,
        });
        setOracleRegistry(OracleRegistry);
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

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

  const getPrice = useCallback(async (asset: string, cached: boolean) => {
    try {
      setError(null);
      setLoading(true);

      await rateLimitCheck();

      if (!oracleRegistry) {
        fetchOracleRegistry();
        return undefined;
      }

      const oraclePriceData = await oracleRegistry.get_price({
        asset,
        cached,
        action: defaultAction,
      });

      if (oraclePriceData?.result) {
        return oraclePriceData?.result;
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return undefined;
  }, []);

  const getLastPrice = useCallback(async (asset: string) => {
    try {
      setError(null);
      setLoading(true);

      await rateLimitCheck();

      if (!oracleRegistry) {
        fetchOracleRegistry();
        return undefined;
      }
      const oraclePriceData = await oracleRegistry.get_last_price({
        asset,
      });

      if (oraclePriceData?.result) {
        return oraclePriceData.result;
      }
    } catch (e: any) {
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

      await rateLimitCheck();

      if (!oracleRegistry) {
        fetchOracleRegistry();
        return undefined;
      }

      const oracle = await oracleRegistry.get_oracle({
        asset,
      });

      if (oracle?.result) {
        return oracle.result;
      }
    } catch (e: any) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return undefined;
  }, []);

  useEffect(() => {
    const OracleRegistry = new OracleRegistryContract.Client({
      contractId: constants.ORALCE_REGISTY_ADDRESS,
      networkPassphrase: constants.NETWORK_PASSPHRASE,
      rpcUrl: constants.RPC_URL,
    });
    setOracleRegistry(OracleRegistry);
  }, []);

  return {
    error,
    loading,
    oracleRegistry,
    getPrice,
    getLastPrice,
    getOracle,
  };
}
