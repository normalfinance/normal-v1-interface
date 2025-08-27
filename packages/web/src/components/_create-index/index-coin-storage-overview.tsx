'use client';

import type { IndexCoin } from '@/types/indexes';
import type { CardProps } from '@mui/material/Card';

import { useTranslate } from '@/locales';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from '../template/chart';

import type { ChartOptions } from '../template/chart';

type ChartConfig = {
  colors?: string[];
  options?: ChartOptions;
};

type Props = CardProps & {
  total: number;
  data: IndexCoin[];
  chart?: ChartConfig;
  onRemoveCoin?: (id: number) => void;
  onReplaceCoin?: (id: number) => void;
};

export function IndexCoinStorageOverview({
  data,
  total,
  chart,
  onRemoveCoin,
  onReplaceCoin,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate();

  const chartColors = chart?.colors ?? [
    theme.palette.secondary.main,
    theme.palette.secondary.light,
  ];

  const sumOfIndexPercentages = data.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    stroke: { width: 0 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: chartColors[0], opacity: 1 },
          { offset: 100, color: chartColors[1], opacity: 1 },
        ],
      },
    },
    plotOptions: {
      radialBar: {
        offsetY: 40,
        startAngle: -90,
        endAngle: 90,
        hollow: { margin: -24 },
        track: { margin: -24 },
        dataLabels: {
          name: { offsetY: 8 },
          value: { offsetY: -36 },
          total: {
            label: t('createIndex.chart.usedOfAllocation', 'Used of 100% allocation'),
            color: theme.vars.palette.text.disabled,
            fontSize: theme.typography.caption.fontSize as string,
            fontWeight: theme.typography.caption.fontWeight,
          },
        },
      },
    },
    ...(chart?.options || {}),
  });

  return (
    <Box sx={sx} {...other}>
      <Chart
        type="radialBar"
        series={[sumOfIndexPercentages]}
        options={chartOptions}
        sx={{ mx: 'auto', width: 240, height: 240 }}
      />

      <Stack
        spacing={3}
        sx={{
          px: 0,
          pb: 5,
          mt: -4,
          zIndex: 1,
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        {data.map((coin) => (
          <Button
            key={coin.id}
            sx={{
              gap: 2,
              display: 'flex',
              alignItems: 'center',
              typography: 'subtitle2',
            }}
            onClick={() => onReplaceCoin?.(coin.id)}
          >
            <Box sx={{ width: 36, height: 36 }} component="img" src={coin.url} alt={coin.name} />

            <Stack flex="1 1 auto" textAlign="left">
              <div>{coin.name}</div>
              <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                {coin.shortName}
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Stack flex="1 1 auto" textAlign="right">
                <div>{fRawPercent(coin.indexPercentage)}</div>
                <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                  {fCurrencyTwoDecimals(coin.price)}
                </Box>
              </Stack>
              <Button
                sx={{
                  color: theme.vars.palette.error.main,
                  fontSize: '12px',
                }}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCoin?.(coin.id);
                }}
              >
                {t('common.remove', 'Remove')}
              </Button>
            </Box>
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
