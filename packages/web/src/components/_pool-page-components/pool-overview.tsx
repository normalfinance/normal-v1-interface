import 'react-loading-skeleton/dist/skeleton.css';

import type BigNumber from 'bignumber.js';
import type { Pair } from '@normalfinance/types';
import type { CardProps } from '@mui/material/Card';

import { useAgo } from '@/hooks';
import { useTranslate } from '@/locales';
import Skeleton from 'react-loading-skeleton';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fPercent, fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Avatar } from '@mui/material';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import SwapCard from '../_common/trade-card';
import RefreshButton from '../_common/refresh-button';

// ----------------------------------------------------------------------
// ── Prop types ---------------------------------------------------------

export interface TreasuryBalance {
  address: string;
  type: 'LONG' | 'SHORT' | 'USDC';
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
  pair: Pair;
  treasuryBalances: [TreasuryBalance, TreasuryBalance, TreasuryBalance];
  stats: PoolStat[];
  onRefresh: () => void;
  actionButtons?: PoolActionButton[];
  loading?: boolean;
};

// ----------------------------------------------------------------------

export function PoolOverview({
  pair,
  treasuryBalances,
  stats,
  onRefresh,
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Avatar
            src={getCryptoIconUrl(`n${pair.asset}`)}
            alt={pair.asset}
            sx={{ width: 64, height: 64 }}
          />
        </Box>

        <Typography component="span" color="text.primary" variant="h6" ml={1}>
          {pair.asset}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <RefreshButton onRefresh={onRefresh} sx={{ ml: 1 }} />
        </Box>
      </Box>

      {/* Price */}
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
        <Typography variant="subtitle1" color="text.secondary">
          {t('Price')}
        </Typography>
        <Typography variant="h3" color="text.primary">
          {fCurrency(pair.scaledPrice)}
        </Typography>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <SwapCard defaultTokenSymbol={`n${pair.asset}`} />
      </Box>

      {/* Collateral */}
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
        <Typography variant="subtitle1" color="text.secondary">
          {t('Total Collateral (TVL)')}
        </Typography>
        <Typography variant="h3" color="text.primary">
          {fCurrency(pair.collateral.totalCollateral)}
        </Typography>
      </Stack>

      {/* Liquidity */}
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
          {t('Liquidity')}
        </Typography>

        <Typography variant="caption" sx={{ mt: -2 }}>
          {t('as of')} {pairLastUpdated}
        </Typography>

        <Typography variant="h3" color="text.primary">
          {fCurrency(totalFiatValue)}
        </Typography>

        <Stack
          sx={{
            width: '100%',
            gap: '4px',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            {t('By asset')}
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
              {balLong.amount.toFixed(2)} {`n${pair.asset}`}
            </Typography>
            <Typography variant="subtitle2" color="text.primary">
              {balShort.amount.toFixed(2)} {`sn${pair.asset}`}
            </Typography>
            <Typography variant="subtitle2" color="text.primary">
              {balQuote.amount.toFixed(2)} USD
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
                bgcolor: theme.palette.success.light,
              }}
            />
            <Box
              sx={{
                flexGrow: pctShort.toNumber() * 100,
                bgcolor: theme.palette.error.main,
                opacity: 0.3,
              }}
            />
            <Box
              sx={{
                flexGrow: pctQuote.toNumber() * 100,
                bgcolor: theme.palette.primary.main,
                opacity: 0.3,
              }}
            />
          </Box>
        </Stack>

        {/* Info */}
        <Stack
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: '15px',
          }}
        >
          {stats.map(({ statName, value }) => (
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
                  <Typography variant="h3">
                    {statName.includes('Collateral')
                      ? fPercent(value.multipliedBy(100).toString())
                      : fCurrency(value.toString())}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
