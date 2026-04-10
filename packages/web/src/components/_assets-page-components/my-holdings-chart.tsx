'use client';

import { useTranslate } from '@/locales';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, ChartLegends, useChart } from '@/components/template/chart';

import type { HoldingData } from './my-holdings-table-row';

interface MyHoldingsChartProps {
  holdingsData: HoldingData[];
}

export default function MyHoldingsChart({ holdingsData }: MyHoldingsChartProps) {
  const { t } = useTranslate();
  const theme = useTheme();

  const labels = holdingsData.map((h) => h.token.symbol);
  const values = holdingsData.map((h) => h.percentage);

  // Generate colors from theme palette
  const paletteSwatches = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    theme.palette.primary.light,
    theme.palette.info.light,
    theme.palette.success.light,
    theme.palette.warning.light,
  ];
  const chartColors = labels.map((_, idx) => paletteSwatches[idx % paletteSwatches.length]);

  const chartOptions = useChart({
    labels,
    colors: chartColors,
    legend: { show: false },
    stroke: { width: 0 },
    tooltip: {
      fillSeriesColor: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: false,
          },
        },
      },
    },
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('Allocation')} />

      <Chart
        type="donut"
        series={values}
        options={chartOptions}
        sx={{ my: 2, mx: 'auto', width: 220, height: 220 }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ChartLegends
        labels={labels}
        colors={chartColors}
        values={holdingsData.map((h) => fCurrency(h.value))}
        sublabels={holdingsData.map((h) => fRawPercent(h.percentage))}
        sx={{ p: 2, justifyContent: 'center', flexWrap: 'wrap' }}
      />
    </Card>
  );
}
