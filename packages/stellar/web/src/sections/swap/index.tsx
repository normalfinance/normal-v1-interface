'use client';

import SwapCard from '@/components/_common/swap-card';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Stack, useTheme, Typography } from '@mui/material';

export default function SwapView() {
  const theme = useTheme();
  
  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Welcome back 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Account Overview
        </Typography>
      </Stack>
      {/* First row: PortfolioValue/AssetsAndLiabilities */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <SwapCard />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
