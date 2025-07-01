import type { CardProps } from '@mui/material/Card';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent, fShortenNumber } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import SwapCard from '../swap-card';

// ----------------------------------------------------------------------
// ── Prop types ---------------------------------------------------------

export interface PoolBalance {
  coinShortName: string;
  value: number;
}

export interface PoolStat {
  statName: string;
  value: number;
  percentage?: number;
}

export interface PoolActionButton {
  label: string;
  icon: string;
  href?: string; // Optional external/internal link
  onClick?: () => void; // Optional click handler
}

export type PoolsAprProps = CardProps & {
  totalAprPercentage: number;
  poolBalances: [PoolBalance, PoolBalance]; // exactly two items
  stats: PoolStat[]; // any length (e.g. 3-4)
  actionButtons?: PoolActionButton[];
};

// ----------------------------------------------------------------------

export function PoolsApr({ totalAprPercentage, poolBalances, stats, sx, ...other }: PoolsAprProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const [showSwap, setShowSwap] = useState(false);

  const actionButtons = [
    {
      label: 'Swap',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => setShowSwap((prev) => !prev),
    },
    {
      label: 'Add liquidity',
      icon: 'mingcute:add-line',
      href: '/positions/create',
    },
  ];

  const [balA, balB] = poolBalances;
  const total = balA.value + balB.value || 1;
  const pctA = balA.value / total;
  const pctB = balB.value / total;

  return (
    <Card
      sx={[
        { display: 'flex', flexDirection: 'column', gap: 2, p: '8px' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Stack direction="row" spacing={1} width="100%">
        {actionButtons.map((btn, idx) => (
          <Button
            key={idx}
            fullWidth
            variant="soft"
            color="success"
            size="large"
            onClick={btn.onClick}
            href={btn.href}
          >
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
      {/* NEED TO ADD TOKENLIST */}
      {showSwap && (
        <Box sx={{ mt: 2 }}>
          <SwapCard />
        </Box>
      )}
      <Stack
        sx={{
          alignItems: 'flex-start',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          p: '20px',
          width: '100%',
        }}
      >
        <Typography variant="subtitle1" color="text.secondary">{t('Total APR')}</Typography>
        <Typography variant="h3" color="text.primary">
          {totalAprPercentage}{t('%')}</Typography>
      </Stack>
      {/* —— Stats list ———————————————————— */}
      <Stack
        sx={{
          alignItems: 'flex-start',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          p: '20px',
          width: '100%',
          gap: '15px',
        }}
      >
        <Typography variant="h5" color="text.primary">{t('Stats')}</Typography>

        <Stack
          sx={{
            width: '100%',
            gap: '4px',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">{t('Pool balances')}</Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography variant="subtitle2" color="text.primary">
              {fShortenNumber(balA.value)} {balA.coinShortName}
            </Typography>
            <Typography variant="subtitle2" color="text.primary">
              {fShortenNumber(balB.value)} {balB.coinShortName}
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 6,
              display: 'flex',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flexGrow: pctA,
                bgcolor: theme.palette.primary.dark,
              }}
            />
            <Box
              sx={{
                flexGrow: pctB,
                bgcolor: theme.palette.primary.dark,
                opacity: 0.3,
              }}
            />
          </Box>
        </Stack>
        <Stack
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: '15px',
          }}
        >
          {stats.map(({ statName, value, percentage }) => (
            <Stack
              key={statName}
              sx={{
                width: '100%',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {statName}
              </Typography>
              <Box>
                <Stack direction="row" spacing={1} alignItems="end">
                  <Typography variant="h3">{fShortenNumber(value)}</Typography>
                  {percentage != null && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Box
                        component="span"
                        sx={{
                          width: 24,
                          height: 24,
                          display: 'flex',
                          borderRadius: '50%',
                          position: 'relative',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
                          color: 'success.dark',
                          ...theme.applyStyles('dark', {
                            color: 'success.light',
                          }),
                          ...(percentage < 0 && {
                            bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
                            color: 'error.dark',
                            ...theme.applyStyles('dark', {
                              color: 'error.light',
                            }),
                          }),
                        }}
                      >
                        <Iconify
                          width={16}
                          icon={percentage < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
                          color={percentage < 0 ? 'error.main' : 'success.main'}
                        />
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: percentage < 0 ? 'error.main' : 'success.main' }}
                      >
                        {percentage >= 0 && '+'}
                        {fPercent(percentage)}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
