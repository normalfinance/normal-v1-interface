import 'react-loading-skeleton/dist/skeleton.css';

import type { PoolPosition } from '@/hooks';

import { useTranslate } from '@/locales';
import Skeleton from 'react-loading-skeleton';
import { ZEALY_QUEST_IDS } from '@/global-config';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import PositionItem from './position-item';
import ZealyHighlight from '../_common/zealy/zealy-highlight';

// ----------------------------------------------------------------------

export type PositionsTableProps = {
  positions: PoolPosition[];
  loading?: boolean;
};

// ----------------------------------------------------------------------

export function PositionsTable({ positions, loading }: PositionsTableProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const actionButtons = [
    {
      label: t('Add liquidity'),
      icon: 'mingcute:add-line',
      href: '/positions/create',
    },
  ];

  if (loading) {
    return (
      <>
        {/* Action button skeleton */}
        <Stack direction="row" spacing={1} width="100%">
          <Skeleton height={48} width="100%" />
        </Stack>

        {/* Position items skeleton */}
        {Array.from({ length: 3 }).map((_, idx) => (
          <Box key={idx} sx={{ p: 2, pt: 0 }}>
            <Box
              sx={{
                padding: 2,
                width: '100%',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" width={1} alignItems="center" spacing={2}>
                {/* Avatar group */}
                <Stack direction="row">
                  <Skeleton circle width={32} height={32} />
                  <Skeleton circle width={32} height={32} style={{ marginLeft: -8 }} />
                </Stack>

                {/* Position info */}
                <Stack direction="column" width={1} alignItems="start" spacing={1}>
                  <Skeleton height={24} width="40%" />
                  <Stack direction="row" spacing={1}>
                    <Skeleton height={20} width={40} />
                    <Skeleton height={20} width={20} />
                  </Stack>
                </Stack>
              </Stack>

              {/* Performance stats skeleton */}
              <Stack direction="row" width={1} mt={2} gap={3} alignItems="start">
                <Stack direction="column" alignItems="start">
                  <Skeleton height={20} width={80} />
                  <Skeleton height={16} width={60} />
                </Stack>
                <Stack direction="column" alignItems="start">
                  <Skeleton height={20} width={80} />
                  <Skeleton height={16} width={40} />
                </Stack>
              </Stack>
            </Box>
          </Box>
        ))}
      </>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={1} width="100%">
        {actionButtons.map((btn, idx) => (
          <Button key={idx} fullWidth variant="soft" color="success" size="large" href={btn.href}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              <Iconify
                icon={btn.icon}
                width={14}
                sx={{
                  color: theme.palette.primary.dark,
                  cursor: 'pointer',
                  rotate: '-90deg',
                }}
              />
              {btn.label}
            </Box>
          </Button>
        ))}
      </Stack>
      <ZealyHighlight questId={ZEALY_QUEST_IDS.addLiquidity} />

      {positions.map((position, idx) => (
        <PositionItem key={idx} pool={{ name: '', fee: 3 }} position={position} />
      ))}
    </>
  );
}
