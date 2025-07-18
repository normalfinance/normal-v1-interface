'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import type { CardProps } from '@mui/material/Card';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import Skeleton from 'react-loading-skeleton';
import { varAlpha } from 'minimal-shared/utils';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fPercent, fShortenNumber } from '@/utils/format-number';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Tab, Stack, Avatar } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { Chart, useChart, ChartSelect } from '@/components/template/chart';

import { CustomTabsSwapSend } from '../../_common/swap-send-card-custom-card';

import type {
  PoolMetadata,
  TokenPairInfo,
  ChartMetricKey,
  PerformanceInfo,
  ExchangeRateInfo,
  ExplorerChartData,
  ChartTimeframeKey,
} from './pool-chart-data';

// Types

export type LegendValue = {
  title: string;
  number: number;
  formatter?: (value: number) => string;
};

type Props = CardProps & {
  title?: string;
  subheader?: string;
  legendValues?: LegendValue[];
  color?: string;
  chart: ExplorerChartData;
  pairInfo?: TokenPairInfo;
  metadata?: PoolMetadata;
  exchangeRate?: ExchangeRateInfo;
  performance?: PerformanceInfo;
  loading?: boolean;
};

export function PoolChart({
  title,
  subheader,
  legendValues,
  chart,
  color,
  pairInfo,
  metadata,
  exchangeRate,
  performance,
  sx,
  loading,
  ...other
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const effectiveColor = color || theme.palette.primary.main;

  const [selectedMetric, setSelectedMetric] = useState<ChartMetricKey>('price');
  const availableTimeframes = Object.keys(chart[selectedMetric] || {}) as ChartTimeframeKey[];
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframeKey>(
    availableTimeframes[0] || '24h'
  );

  const handleChangeMetric = useCallback(
    (newMetric: string) => {
      const metric = newMetric as ChartMetricKey;
      const newTFs = Object.keys(chart[metric] || {}) as ChartTimeframeKey[];
      setSelectedMetric(metric);
      setSelectedTimeframe(newTFs[0] || '24h');
    },
    [chart]
  );

  const handleChangeTimeframe = useCallback((newTF: string) => {
    setSelectedTimeframe(newTF as ChartTimeframeKey);
  }, []);

  const realtimeData = chart[selectedMetric]?.[selectedTimeframe];

  const chartOptions = useChart({
    colors: [effectiveColor],
    xaxis: {
      categories: realtimeData?.categories || [],
      tickAmount: realtimeData?.tickAmount || 0,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => fShortenNumber(value),
      },
    },
  });

  if (loading) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader
          title={<Skeleton height={24} width="40%" />}
          subheader={<Skeleton height={16} width="60%" />}
          sx={{ mb: 2 }}
        />

        {/* Token pair header skeleton */}
        <Box sx={{ px: 2.5, mb: '20px' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Stack direction="row">
              <Skeleton circle width={27} height={27} />
              <Skeleton circle width={27} height={27} style={{ marginLeft: -12 }} />
            </Stack>
            <Skeleton height={24} width="30%" />
            <Skeleton height={20} width={40} />
            <Skeleton height={20} width={20} />
          </Stack>
        </Box>

        {/* Price and performance skeleton */}
        <Stack sx={{ px: 2.5, mb: '20px' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Skeleton height={32} width="40%" />
            <Skeleton height={32} width="30%" />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton circle width={24} height={24} />
            <Skeleton height={16} width="20%" />
          </Stack>
        </Stack>

        {/* Chart skeleton */}
        <Box sx={{ pl: 1, py: 2.5, pr: 2.5, height: 320 }}>
          <Skeleton height={320} width="100%" />
        </Box>

        {/* Controls skeleton */}
        <Box sx={{ px: 2.5, pb: '20px' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1}>
              <Skeleton height={32} width={40} />
              <Skeleton height={32} width={40} />
              <Skeleton height={32} width={40} />
              <Skeleton height={32} width={40} />
            </Stack>
            <Skeleton height={32} width={80} />
          </Stack>
        </Box>
      </Card>
    );
  }

  if (!realtimeData) {
    return <div>{t('No chart data available')}</div>;
  }

  const timeframeLabels: Record<ChartTimeframeKey, string> = {
    '24h': '1D',
    '7d': '1W',
    '30d': '1M',
    '12m': '1Y',
  };

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 2 }} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          px: 2.5,
          mb: '20px',
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
            src={getCryptoIconUrl(pairInfo?.tokenA.name ?? '')}
            alt="Token A"
            sx={{ width: 27, height: 27 }}
          />

          <Avatar
            src={getCryptoIconUrl(pairInfo?.tokenB.name ?? '')}
            alt="Token B"
            sx={{
              width: 27,
              height: 27,
              ml: '-12px',
              zIndex: 1,
            }}
          />
        </Box>

        <Typography component="span" color="text.primary" variant="h6" ml={1}>
          {pairInfo?.tokenA.name}
          {t('/')}
          {pairInfo?.tokenB.name}
        </Typography>

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
            <Typography
              color="text.primary"
              variant="caption"
              ml={1}
              sx={{
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                px: '6px',
                py: '2px',
              }}
            >
              {metadata?.feeTier}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Typography
              color="text.primary"
              variant="caption"
              ml={1}
              sx={{
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                px: '6px',
                py: '2px',
              }}
            >
              {metadata?.version}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Stack sx={{ px: 2.5, mb: '20px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Typography variant="h4" color="text.primary" noWrap sx={{ mr: 1 }}>
            {exchangeRate?.label}
          </Typography>

          <Typography variant="h4" color="text.secondary" sx={{ ml: { xs: 0, sm: 1 } }}>
            {t('(')}
            {exchangeRate?.usdEquivalent}
            {t(')')}
          </Typography>
        </Box>
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
              ...(performance &&
                performance.percentageChange &&
                performance.percentageChange < 0 && {
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
                performance && performance.percentageChange && performance.percentageChange < 0
                  ? 'eva:trending-down-fill'
                  : 'eva:trending-up-fill'
              }
              color={
                performance && performance.percentageChange && performance.percentageChange < 0
                  ? 'error.main'
                  : 'success.main'
              }
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color:
                performance && performance.percentageChange && performance.percentageChange < 0
                  ? 'error.main'
                  : 'success.main',
            }}
          >
            {performance &&
              performance.percentageChange &&
              performance.percentageChange >= 0 &&
              '+'}
            {fPercent(performance && performance.percentageChange)}
          </Typography>
        </Stack>
      </Stack>
      <Chart
        type="area"
        series={realtimeData.series[0].data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 320,
        }}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '16px',
          px: 2.5,
          pb: '20px',
          ...sx,
        }}
      >
        <CustomTabsSwapSend
          value={selectedTimeframe}
          onChange={(_, newValue) => setSelectedTimeframe(newValue as ChartTimeframeKey)}
          variant="standard"
          sx={{
            bgcolor: 'background.paper',
            padding: '0px',
            py: 0,
          }}
          slotProps={{
            flexContainer: { gap: '8px', p: 0 },
            tab: {
              borderRadius: '8px',
              px: '12px',
              color: theme.palette.text.primary,
            },
            selected: {},
            indicator: {
              boxShadow: 'none !important',
              backgroundColor: alpha(theme.palette.grey[500], 0.08),
              border: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {(Object.keys(chart[selectedMetric] || {}) as ChartTimeframeKey[]).map((tf) => (
            <Tab key={tf} value={tf} label={timeframeLabels[tf] ?? tf.toUpperCase()} />
          ))}
        </CustomTabsSwapSend>
        <div style={{ display: 'flex', gap: 8 }}>
          <ChartSelect
            options={['price', 'volume']}
            value={selectedMetric}
            onChange={handleChangeMetric}
          />
        </div>
      </Box>
    </Card>
  );
}
