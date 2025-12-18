'use client';

import { useIndex } from '@/hooks';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import { Box, Alert, CircularProgress } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import IndexDetailsView from './index-details-view';

export default function IndexView({ id }: { id: string }) {
  const { t } = useTranslate();

  const indexId = Number(id);

  const { index, loading, error } = useIndex(indexId);

  if (!Number.isInteger(indexId)) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('Invalid index fund ID.')}</Alert>
      </DashboardContent>
    );
  }

  if (loading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
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

  return <IndexDetailsView id={indexId} index={index} />;
}
