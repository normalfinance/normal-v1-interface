'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <DashboardContent>
      {/* Profile Cover Card */}
      <Card sx={{ mb: 3, height: 290, position: 'relative' }}>
        {/* Cover image area */}
        <Skeleton height={200} width="100%" />

        {/* Profile info area */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Skeleton circle height={80} width={80} />
          <Stack spacing={1}>
            <Skeleton height={24} width={120} />
            <Skeleton height={16} width={80} />
          </Stack>
        </Box>

        {/* Tab navigation area */}
        <Box
          sx={{
            width: 1,
            bottom: 0,
            position: 'absolute',
            px: { md: 3 },
            display: 'flex',
            justifyContent: { xs: 'center', md: 'flex-end' },
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={2} sx={{ py: 1 }}>
            <Skeleton height={48} width={100} />
            <Skeleton height={48} width={80} />
            <Skeleton height={48} width={90} />
          </Stack>
        </Box>
      </Card>

      {/* Main Content Area - Overview Tab Skeleton */}
      <Grid container spacing={3}>
        {/* Referral Stats Cards */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Stats Row */}
            <Stack direction="row" spacing={3}>
              <Card sx={{ flex: 1, p: 3 }}>
                <Stack spacing={2}>
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={32} width="40%" />
                  <Skeleton height={16} width="80%" />
                </Stack>
              </Card>
              <Card sx={{ flex: 1, p: 3 }}>
                <Stack spacing={2}>
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={32} width="40%" />
                  <Skeleton height={16} width="80%" />
                </Stack>
              </Card>
            </Stack>

            {/* Referral Link Section */}
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Skeleton height={24} width="30%" />
                <Skeleton height={16} width="70%" />
                <Stack direction="row" spacing={2}>
                  <Skeleton height={40} width="70%" />
                  <Skeleton height={40} width={80} />
                </Stack>
              </Stack>
            </Card>

            {/* Referrals Table */}
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Skeleton height={24} width="25%" />
                <Stack spacing={1}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Stack key={idx} direction="row" spacing={2} alignItems="center">
                      <Skeleton height={20} width="30%" />
                      <Skeleton height={20} width="20%" />
                      <Skeleton height={20} width="15%" />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Protocol Points Card */}
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Skeleton height={24} width="70%" />
                <Skeleton height={48} width="60%" />
                <Skeleton height={16} width="90%" />
                <Stack spacing={1}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between">
                      <Skeleton height={16} width="40%" />
                      <Skeleton height={16} width="20%" />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
