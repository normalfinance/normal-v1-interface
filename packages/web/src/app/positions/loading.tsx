'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      {/* PageHeader skeleton */}
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Skeleton height={40} width="30%" />
        <Skeleton height={20} width="50%" />
      </Stack>

      {/* Main content grid */}
      <Grid container spacing={3}>
        {/* LiquidityPositions skeleton */}
        <Grid item xs={12} md={8}>
          <Skeleton height={400} width="100%" />
        </Grid>

        {/* TopPoolsByTVL skeleton */}
        <Grid item xs={12} md={4}>
          <Stack spacing={1}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} height={40} width="100%" />
            ))}
          </Stack>
        </Grid>

        {/* Info alert skeleton */}
        <Grid item xs={12} md={8}>
          <Stack spacing={1}>
            <Skeleton height={30} width="40%" />
            <Skeleton height={20} width="60%" />
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
