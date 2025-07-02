'use client';

import { useTranslate } from '@/locales';

import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';

import SwapCard from '@/components/_common/swap-card';

export default function SwapView() {
  const { t } = useTranslate();
  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <SwapCard />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
