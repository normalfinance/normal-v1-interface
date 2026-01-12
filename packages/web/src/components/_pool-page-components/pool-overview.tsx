import 'react-loading-skeleton/dist/skeleton.css';

import type BigNumber from 'bignumber.js';
import type { CardProps } from '@mui/material/Card';

import { useState } from 'react';
import { useAgo } from '@/hooks';
import { useTranslate } from '@/locales';
import Skeleton from 'react-loading-skeleton';
import { usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';
import { WalletGate } from '@/components/_common/wallet-gate';

import SwapCard from '../_common/trade-card';

// ----------------------------------------------------------------------
// ── Prop types ---------------------------------------------------------

export interface TreasuryBalance {
  address: string;
  type: 'LONG' | 'SHORT' | 'QUOTE';
  amount: BigNumber;
  fiatValue: BigNumber;
}

export interface PoolStat {
  statName: string;
  value: BigNumber;
  percentage?: number;
}

export interface PoolActionButton {
  label: string;
  icon: string;
  href?: string; // Optional external/internal link
  onClick?: () => void; // Optional click handler
}

export type PoolsOverviewProps = CardProps & {
  totalAprPercentage: number;
  treasuryBalances: [TreasuryBalance, TreasuryBalance, TreasuryBalance];
  stats: PoolStat[];
  actionButtons?: PoolActionButton[];
  loading?: boolean;
};

// ----------------------------------------------------------------------

export function PoolOverview({
  totalAprPercentage,
  treasuryBalances,
  stats,
  loading,
  sx,
  ...other
}: PoolsOverviewProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const {
    pairState: { lastUpdated },
  } = usePersistStore();

  const pairLastUpdated = useAgo(lastUpdated);

  const [showSwap, setShowSwap] = useState(false);

  const actionButtons = [
    {
      label: 'Trade',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => setShowSwap((prev) => !prev),
    },
  ];

  const [balLong, balShort, balQuote] = treasuryBalances;
  const totalFiatValue = balLong.fiatValue.plus(balShort.fiatValue).plus(balQuote.fiatValue);
  const pctLong = balLong.fiatValue.div(totalFiatValue);
  const pctShort = balShort.fiatValue.div(totalFiatValue);
  const pctQuote = balQuote.fiatValue.div(totalFiatValue);

  if (loading) {
    return (
      <Card
        sx={[
          { display: 'flex', flexDirection: 'column', gap: 2, p: '8px' },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {/* Action buttons skeleton */}
        <Stack direction="row" spacing={1} width="100%">
          <Skeleton height={48} width="50%" />
          <Skeleton height={48} width="50%" />
        </Stack>

        {/* APR section skeleton */}
        <Stack spacing={1} sx={{ textAlign: 'center', py: 2 }}>
          <Skeleton height={20} width="40%" style={{ margin: '0 auto' }} />
          <Skeleton height={32} width="30%" style={{ margin: '0 auto' }} />
        </Stack>

        {/* Balance chart skeleton */}
        <Stack spacing={2}>
          <Skeleton height={20} width="50%" />
          <Skeleton height={8} width="100%" />
          <Stack direction="row" justifyContent="space-between">
            <Skeleton height={16} width="30%" />
            <Skeleton height={16} width="30%" />
          </Stack>
        </Stack>

        {/* Stats skeleton */}
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Stack key={idx} direction="row" justifyContent="space-between">
              <Skeleton height={16} width="40%" />
              <Skeleton height={16} width="30%" />
            </Stack>
          ))}
        </Stack>
      </Card>
    );
  }

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
          <WalletGate
            key={idx}
            buttonText={`Login to ${btn.label}`}
            fullWidth
            variant="soft"
            color="success"
          >
            <Button
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
          </WalletGate>
        ))}
      </Stack>
      {showSwap && (
        <Box sx={{ mt: 2 }}>
          <SwapCard />
        </Box>
      )}
      {/* <Stack
        sx={{
          alignItems: 'flex-start',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          p: '20px',
          width: '100%',
        }}
      >
        <Typography variant="subtitle1" color="text.secondary">
          {t('Total APR')}
        </Typography>
        <Typography variant="h3" color="text.primary">
          <Chip label="Coming soon" color="info" size="small" variant="soft" />
          {totalAprPercentage}
          {t('%')}
        </Typography>
      </Stack> */}
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
        <Typography variant="h5" color="text.primary">
          {t('Stats')}
        </Typography>

        <Typography variant="caption" sx={{ mt: -2 }}>
          {t('as of')} {pairLastUpdated}
        </Typography>

        <Stack
          sx={{
            width: '100%',
            gap: '4px',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            {t('Treasury balances')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography variant="subtitle2" color="text.primary">
              {balLong.amount.toFixed(2)} {balLong.type}
            </Typography>
            <Typography variant="subtitle2" color="text.primary">
              {balShort.amount.toFixed(2)} {balShort.type}
            </Typography>
            <Typography variant="subtitle2" color="text.primary">
              {balQuote.amount.toFixed(2)} USDC
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
                flexGrow: pctLong.toNumber() * 100,
                bgcolor: theme.palette.primary.dark,
              }}
            />
            <Box
              sx={{
                flexGrow: pctShort.toNumber() * 100,
                bgcolor: theme.palette.primary.dark,
                opacity: 0.3,
              }}
            />
            <Box
              sx={{
                flexGrow: pctQuote.toNumber() * 100,
                bgcolor: theme.palette.primary.dark,
                opacity: 0.3,
              }}
            />
          </Box>
        </Stack>
        {/* <Stack
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
                  {statName !== 'TVL' ? (
                    <Chip
                      label="Coming soon"
                      color="info"
                      size="small"
                      variant="soft"
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <>
                      <Typography variant="h3">{fCurrency(value.toFixed(2))}</Typography>
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
                              icon={
                                percentage < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'
                              }
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
                    </>
                  )}
                </Stack>
              </Box>
            </Stack>
          ))}
        </Stack> */}
      </Stack>
    </Card>
  );
}
