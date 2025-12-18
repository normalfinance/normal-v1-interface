import 'react-loading-skeleton/dist/skeleton.css';

import type { PoolQueryParams } from '@/types/query-params';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useBoolean, type PoolPosition } from '@/hooks';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Grid2, Stack, Button } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import PositionItem from './position-item';
import WithdrawLiquidityDialog from './withdraw-liquidity-dialog';

// ----------------------------------------------------------------------

export type PositionsTableProps = {
  positions: PoolPosition[];
  loading?: boolean;
  queryParams?: PoolQueryParams;
};

// ----------------------------------------------------------------------

export function PositionsTable({ positions, loading, queryParams }: PositionsTableProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const withdraw = useBoolean();

  const [selectedPosition, setSelectedPosition] = useState<PoolPosition | undefined>(undefined);

  const actionButtons = [
    {
      label: t('Deposit'),
      icon: 'mingcute:add-line',
      href: '/earn',
    },
  ];

  // Automatically open dialog if query parameters are present
  useEffect(() => {
    if (queryParams?.amount) {
      withdraw.onTrue();
    }
  }, [queryParams?.amount, withdraw]);

  if (loading) {
    return (
      <>
        {/* Action button skeleton */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} justifyContent="flex-start">
          <Skeleton height={48} width={160} />
        </Stack>

        {/* Position items skeleton */}
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
      </>
    );
  }

  return (
    <>
      {/* Action buttons */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2 }}
        justifyContent="flex-start"
        alignItems="center"
      >
        {actionButtons.map((btn) => (
          <Box key={btn.href} sx={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              variant="soft"
              color="success"
              size="large"
              href={btn.href}
              startIcon={
                <Iconify
                  icon={btn.icon}
                  width={14}
                  sx={{ color: theme.palette.primary.dark, rotate: '-90deg' }}
                />
              }
            >
              {btn.label}
            </Button>
          </Box>
        ))}
      </Stack>

      {/* Positions grid */}
      <Grid2 container spacing={2}>
        {positions.map((position) => (
          <Grid2 key={position.pool.addresses.pool} size={{ xs: 12, sm: 6, md: 4 }}>
            <PositionItem
              position={position}
              onWithdraw={() => {
                setSelectedPosition(position);
                withdraw.onTrue();
              }}
            />
          </Grid2>
        ))}
      </Grid2>

      {/* Withdraw dialog */}
      {selectedPosition && (
        <WithdrawLiquidityDialog
          open={withdraw.value}
          position={selectedPosition}
          onClose={() => {
            setSelectedPosition(undefined);
            withdraw.onFalse();
          }}
          queryParams={queryParams}
        />
      )}
    </>
  );
}
