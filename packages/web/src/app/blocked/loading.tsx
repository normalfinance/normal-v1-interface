'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return (
    <Box
      sx={{
        bgcolor: (theme) => theme.palette.grey[100],
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <DashboardContent maxWidth="xl">
        <Grid2 container justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
          <Stack
            spacing={3}
            textAlign="center"
            sx={{
              bgcolor: 'common.white',
              p: { xs: 3, md: 6 },
              borderRadius: 2,
              boxShadow: 3,
              maxWidth: 520,
              width: '100%',
            }}
          >
            {/* Title */}
            <Skeleton height={40} width="60%" style={{ margin: '0 auto' }} />

            {/* Description paragraphs */}
            <Stack spacing={1}>
              <Skeleton height={20} width="100%" />
              <Skeleton height={20} width="95%" />
              <Skeleton height={20} width="90%" />
              <Skeleton height={20} width="80%" />
            </Stack>

            {/* Links/Buttons */}
            <Stack spacing={2} alignItems="center">
              <Skeleton height={16} width="40%" />
              <Skeleton height={40} width={120} />
            </Stack>
          </Stack>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}
