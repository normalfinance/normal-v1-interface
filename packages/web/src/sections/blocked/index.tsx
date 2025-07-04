'use client';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

export default function BlockedView() {
  const { t } = useTranslate();

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" color="text.primary">
        {t('Create a Crypto Index')}
      </Typography>
    </DashboardContent>
  );
}
