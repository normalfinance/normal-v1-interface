'use client';

import { useTranslate } from '@/locales';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartLegends } from '@/components/template/chart';

import type { HoldingData } from './my-holdings-table-row';

interface MyHoldingsChartProps {
  holdingsData: HoldingData[];
}

// Perceptually distinct colors that work across light/dark modes
const CHART_COLORS = [
  '#00aff7', // cyan blue
  '#f8279c', // hot pink
  '#06D6A0', // emerald
  '#FCA311', // amber
  '#6E4BFF', // purple
  '#EF233C', // red
  '#3DDC97', // mint green
  '#FF6B35', // orange
  '#2EC4B6', // teal
  '#8338EC', // violet
];

export default function MyHoldingsChart({ holdingsData }: MyHoldingsChartProps) {
  const { t } = useTranslate();

  const labels = holdingsData.map((h) => h.token.symbol);
  const values = holdingsData.map((h) => h.percentage);

  const chartColors = labels.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]);

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
