'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          {/* Placeholder for SwapCard */}
          <div style={{ height: '500px', width: '100%' }} />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
