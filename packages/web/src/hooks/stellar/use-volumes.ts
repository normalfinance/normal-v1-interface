'use client';

import type { TimeEpoch } from '@normalfinance/types';

import { useState, useEffect, useCallback } from 'react';
import { fetchPoolVolumeSince, fetchAllPoolsVolumeSince } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  totalVolume1d: number | undefined;
  getVolumeSince: (poolAddress: string, timeEpoch: TimeEpoch) => Promise<number>;
}

// ----------------------------------------------------------------------

export function useVolumes(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalVolume1d, setTotalVolume1d] = useState<number | undefined>(undefined);

  const getTotalVolumeSince = useCallback(async (timeEpoch: TimeEpoch) => {
    try {
      const volume = await fetchAllPoolsVolumeSince(timeEpoch);
      setTotalVolume1d(volume);
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return;
  }, []);

  const getVolumeSince = useCallback(async (poolAddress: string, timeEpoch: TimeEpoch) => {
    try {
      const volume = await fetchPoolVolumeSince(poolAddress, timeEpoch);
      return volume;
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return undefined;
  }, []);

  // On component mount, fetch total volume
  useEffect(() => {
    getTotalVolumeSince('daily');
  }, [getTotalVolumeSince]);

  return {
    error,
    loading,
    totalVolume1d,
    getVolumeSince,
  };
}
