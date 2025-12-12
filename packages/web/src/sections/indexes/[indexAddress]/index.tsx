'use client';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { isValidContractAddress } from '@normalfinance/utils';

import { Alert, CircularProgress, Box } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';
import { useIndex } from '@/hooks';

import IndexDetailsView from './index-details-view';

export default function IndexView({ indexAddress }: { indexAddress: string }) {
  const { t } = useTranslate();

  const isAddressValid = isValidContractAddress(indexAddress);

  const { index, loading, error } = useIndex(indexAddress);

  if (!isAddressValid) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('Invalid index contract address.')}</Alert>
      </DashboardContent>
    );
  }

  if (loading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="error">{t('There was an error loading this index.')}</Alert>
      </DashboardContent>
    );
  }

  if (!index) {
    return <SpecificNotFound type="index" />;
  }

  return <IndexDetailsView index={index} indexAddress={indexAddress} />;
}
