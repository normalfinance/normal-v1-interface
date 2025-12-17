'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import { Box, Grid, Stack } from '@mui/material';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack spacing={1}>
        <Skeleton height={40} width="25%" />
        <Skeleton height={20} width="15%" />
      </Stack>

      {/* Main grid */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Box
          sx={{
            mt: { xs: 12, md: 0 },
            maxWidth: '1440px',
            width: '100%',
          }}
        >
          {/* Token icons + pair name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton circle width={40} height={40} />
            <Skeleton circle width={40} height={40} style={{ marginLeft: -1 }} />
            <Skeleton height={32} width="30%" style={{ marginLeft: 2 }} />
          </Box>

          {/* Stats & Liquidity */}
          <Grid container spacing={2}>
            {/* PoolStatsTemp skeleton */}
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <Skeleton height={20} width="20%" />
                    <Skeleton height={20} width="60%" />
                  </Stack>
                ))}
              </Box>
            </Grid>

            {/* PoolLiquidityTemp skeleton */}
            <Grid item xs={12} md={4}>
              <Skeleton height={300} width="100%" />
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </DashboardContent>
  );
}
