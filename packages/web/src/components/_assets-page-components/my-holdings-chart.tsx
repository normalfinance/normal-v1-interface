'use client';

import { useTranslate } from '@/locales';
import { fRawPercent, fCurrency } from '@/utils/format-number';

import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import { useTheme } from '@mui/material/styles';

import { ChartLegends } from '@/components/template/chart';
import IndexDonutChart from '@/components/_index-details/index-donut-chart';

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

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('Allocation')} />

      <IndexDonutChart
        labels={labels}
        values={values}
        colors={chartColors}
        height={220}
        sx={{ my: 2, mx: 'auto' }}
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
