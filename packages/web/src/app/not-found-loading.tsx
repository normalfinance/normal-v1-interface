'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import Skeleton from 'react-loading-skeleton';
import { SimpleLayout } from '@/layouts/simple';

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

export default function NotFoundLoading() {
  return (
    <SimpleLayout
      slotProps={{
        content: { compact: true },
      }}
    >
      <Container>
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ py: 8 }}>
          {/* Title */}
          <Skeleton height={40} width="50%" />

          {/* Description */}
          <Stack spacing={1} sx={{ maxWidth: 480 }}>
            <Skeleton height={20} width="100%" />
            <Skeleton height={20} width="90%" />
          </Stack>

          {/* Illustration placeholder */}
          <Skeleton height={240} width={300} />

          {/* Button */}
          <Skeleton height={48} width={120} />
        </Stack>
      </Container>
    </SimpleLayout>
  );
}
