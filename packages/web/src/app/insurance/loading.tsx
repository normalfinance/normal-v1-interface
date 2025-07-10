'use client';

import { DashboardContent } from '@/layouts/dashboard';
import Grid2 from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack spacing={1}>
        <Skeleton height={40} width="120px" />
        <Skeleton height={20} width="60%" />
      </Stack>

      {/* Stat cards row */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Grid2 key={idx} size={{ xs: 12, md: 4 }}>
            <Skeleton height={200} width="100%" />
          </Grid2>
        ))}
      </Grid2>

      {/* Descriptive text */}
      <Stack sx={{ mt: 3, maxWidth: '976px', mx: 'auto', px: 2 }} textAlign="center">
        <Skeleton count={3} height={20} width="100%" />
      </Stack>

      {/* CurrentBalance + AreaChartCard */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Skeleton height={300} width="100%" />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Skeleton height={400} width="100%" />
        </Grid2>
      </Grid2>

      {/* TabsTable */}
      <Grid2 sx={{ mt: 3 }}>
        <Skeleton height={720} width="100%" />
      </Grid2>
    </DashboardContent>
  );
}
