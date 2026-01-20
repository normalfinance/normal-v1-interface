'use client';

import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

import { ContentSkeleton } from './content-skeleton';

import type { ContentSkeletonProps } from './content-skeleton';

interface SectionLoadingProps {
  loading: boolean;
  children: ReactNode;
  skeleton?: ContentSkeletonProps;
  minHeight?: number | string;
  sx?: SxProps<Theme>;
}

export function SectionLoading({
  loading,
  children,
  skeleton = { variant: 'card' },
  minHeight,
  sx,
}: SectionLoadingProps) {
  if (loading) {
    return (
      <Box sx={{ minHeight, ...sx }}>
        <ContentSkeleton {...skeleton} />
      </Box>
    );
  }

  return <>{children}</>;
}
