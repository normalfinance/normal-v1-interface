'use client';

import { usePool } from '@/hooks';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import { Alert } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import PoolDetailsView from './pool-details-view';
import { useCallback, useEffect, useState } from 'react';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const { t } = useTranslate();

  const { loading, error, fetchPoolByAddress } = usePool();

  const [pool, setPool] = useState<any>();

  //  useCallback(async () => await fetchPoolByAddress(poolAddress), [poolAddress]);

  useEffect(() => {
    const run = async function () {
      const poolInfo = await fetchPoolByAddress(poolAddress);
      setPool(poolInfo);
    };

    run();
  }, [poolAddress]);

  if (error != null) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('There was an error loading this pool.')}</Alert>
      </DashboardContent>
    );
  }

  if (!pool || pool == undefined) {
    return <SpecificNotFound type="pool" />;
  }

  return <PoolDetailsView poolAddress={poolAddress} pool={pool} />;
}
