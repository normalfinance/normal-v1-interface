'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

export type ContentSkeletonVariant = 'card' | 'table-row' | 'stat' | 'form' | 'list-item';

export interface ContentSkeletonProps {
  variant?: ContentSkeletonVariant;
  count?: number;
  sx?: SxProps<Theme>;
}

const VARIANTS: Record<ContentSkeletonVariant, () => React.ReactNode> = {
  card: () => (
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </Stack>
  ),
  'table-row': () => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2, px: 2 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" />
      </Box>
      <Skeleton variant="text" width={80} />
      <Skeleton variant="text" width={80} />
      <Skeleton variant="text" width={60} />
    </Stack>
  ),
  stat: () => (
    <Stack spacing={1} sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="text" width="60%" height={32} />
    </Stack>
  ),
  form: () => (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Skeleton variant="text" width="30%" height={20} />
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="text" width="30%" height={20} />
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mt: 2 }} />
    </Stack>
  ),
  'list-item': () => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5, px: 2 }}>
      <Skeleton variant="circular" width={32} height={32} />
      <Stack flex={1}>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="30%" height={16} />
      </Stack>
    </Stack>
  ),
};

export function ContentSkeleton({ variant = 'card', count = 1, sx }: ContentSkeletonProps) {
  const renderSkeleton = VARIANTS[variant];

  return (
    <Box sx={sx}>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ mb: index < count - 1 ? 2 : 0 }}>
          {renderSkeleton()}
        </Box>
      ))}
    </Box>
  );
}
