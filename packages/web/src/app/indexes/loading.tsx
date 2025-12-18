'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <DashboardContent maxWidth="xl">
      {/* PageHeader skeleton */}
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Skeleton height={40} width="30%" />
        <Skeleton height={20} width="50%" />
      </Stack>
    </DashboardContent>
  );
}
