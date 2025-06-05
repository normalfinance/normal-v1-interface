'use client';


import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/store';
import { DashboardContent } from '@/layouts/dashboard';
import { PoolsExplorer } from '@/components/_common/pools-explore/pools-explore';

import Grid2 from '@mui/material/Grid2';
import { useTheme } from '@mui/material';
// import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';


export default function PoolsView() {
  const theme = useTheme();
  const store = useAppStore(); // Global state management
  const router = useRouter(); // Next.js router

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Explore
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <PoolsExplorer />
      </Grid2>
    </DashboardContent>
  );
}
