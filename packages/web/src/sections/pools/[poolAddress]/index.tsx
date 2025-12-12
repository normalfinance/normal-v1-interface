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

  const isAddressValid = isValidContractAddress(poolAddress);

  const { setGlobalIsLoading } = useAppStore();

  const {
    wallet,
    getAllTokens,
    poolState: { pools },
    getPool,
  } = usePersistStore();

  // Effect hook to fetch all tokens and pools once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        if (poolAddress && isAddressValid) await getPool(poolAddress);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [poolAddress, isAddressValid, wallet.address]);

  const pool = useMemo(() => {
    if (!poolAddress || !isAddressValid || !pools || !pools.length) return undefined;

    return pools.find((p) => p.addresses.pool === poolAddress);
  }, [poolAddress, isAddressValid, pools]);

  if (isAddressValid === false) {
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
