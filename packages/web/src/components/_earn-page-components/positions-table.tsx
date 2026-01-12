import 'react-loading-skeleton/dist/skeleton.css';

import type { PoolQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import { type LiquidityPosition } from '@/hooks';

import Box from '@mui/material/Box';
import { Grid2 } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import PositionItem from './position-item';

// ----------------------------------------------------------------------

export type PositionsTableProps = {
  positions: LiquidityPosition[];
  loading?: boolean;
  queryParams?: PoolQueryParams;
};

// ----------------------------------------------------------------------

export function PositionsTable({ positions, loading, queryParams }: PositionsTableProps) {
  const theme = useTheme();

  // Automatically open dialog if query parameters are present
  useEffect(() => {
    // if (queryParams?.amount) {
    //   withdraw.onTrue();
    // }
  }, [queryParams?.amount]);

  if (loading) {
    return (
      <Grid2 container spacing={1}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Grid2 key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                width: 1,
                boxSizing: 'border-box',
              }}
            >
              <Skeleton height={160} />
            </Box>
          </Grid2>
        ))}
      </Grid2>
    );
  }

  return (
    <Grid2 container spacing={2}>
      {positions.map((position) => (
        <Grid2 key={position.pair.pairAddress} size={{ xs: 12, sm: 6, md: 4 }}>
          <PositionItem position={position} />
        </Grid2>
      ))}
    </Grid2>
  );
}
