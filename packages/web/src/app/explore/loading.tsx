'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      {/* Header title */}
      <Stack spacing={1}>
        <Skeleton height={40} width="8rem" />
      </Stack>

      {/* Stats cards row */}
      <Grid2 width={1} sx={{ mt: 3 }}>
        <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} height={120} width="100%" />
          ))}
        </Box>
      </Grid2>

      {/* Tokens table */}
      <Grid2 width={1} sx={{ mt: 3 }}>
        <Skeleton height={720} width="100%" />
      </Grid2>

      {/* PoolsExplorer section */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={12}>
          {/* mimic the legend/header inside PoolsExplorer */}
          <Skeleton height={40} width="25%" />
          {/* chart area */}
          <Skeleton style={{ marginTop: 24 }} height={400} width="100%" />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
