'use client';

import { usePool } from '@/hooks';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import { Alert } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import PoolDetailsView from './pool-details-view';

export default function PoolView({ asset }: { asset: string }) {
  const { t } = useTranslate();

  const { loading, error, pool } = usePool(asset);

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

  return <PoolDetailsView asset={asset} pool={pool} />;
}
