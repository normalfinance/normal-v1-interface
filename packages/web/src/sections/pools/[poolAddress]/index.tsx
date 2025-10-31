'use client';

import { useTranslate } from '@/locales';
import { useMemo, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { logger, isValidContractAddress } from '@normalfinance/utils';

import { Alert } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import PoolDetailsView from './pool-details-view';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const { t } = useTranslate();

  const validContractAddress = isValidContractAddress(poolAddress);

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const {
    getAllTokens,
    poolState: { pools },
    getAllPools,
  } = usePersistStore();

  // Effect hook to fetch all tokens and pools once the component mounts
  useEffect(() => {
    const refreshData = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await Promise.all([await getAllTokens(), await getAllPools()]);
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    if (validContractAddress) refreshData();
  }, []);

  const pool = useMemo(() => {
    if (!validContractAddress) return undefined;
    if (!pools || pools.length === 0) return undefined;

    return pools.find((p) => p.addresses.pool === poolAddress);
  }, [poolAddress, validContractAddress, pools]);

  if (validContractAddress === false) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('Invalid pool contract address.')}</Alert>
      </DashboardContent>
    );
  }

  // if (error != null) {
  //   return (
  //     <DashboardContent maxWidth="xl">
  //       <Alert severity="info">{t('There was an error loading this pool.')}</Alert>
  //     </DashboardContent>
  //   );
  // }

  if (!pool || pool == undefined) {
    return <SpecificNotFound type="pool" />;
  }

  return <PoolDetailsView pool={pool} />;
}
