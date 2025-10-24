'use client';

import { useEffect, useState } from 'react';

import { usePool } from '@/hooks';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import { Alert } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import PoolDetailsView from './pool-details-view';
import { PoolInfo } from '@normalfinance/types';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const { t } = useTranslate();

  const { error, fetchPoolByAddress } = usePool();

  const [pool, setPool] = useState<PoolInfo | undefined>(undefined);

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
