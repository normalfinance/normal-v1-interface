'use client';

import type { CardProps } from '@mui/material/Card';
import type { TimeframeKey, RealtimeChartData } from '@/utils/portfolio-value-chart-series';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { fShortenNumber } from '@/utils/format-number';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartSelect, ChartLegends } from '@/components/template/chart';

export type LegendValue = {
  title: string;
  number: number;
  formatter?: (value: number) => string;
};

interface AreaChartCardProps extends CardProps {
  title?: string;
  subheader?: string;
  legendValues?: LegendValue[];
  color?: string;
  // Chart data for various timeframes:
  chart: Partial<Record<TimeframeKey, RealtimeChartData>>;
  // New prop to indicate if values should be formatted as percentages
  percentage?: boolean;
}

export function AreaChartCard({
  title,
  subheader,
  legendValues,
  chart,
  color,
  percentage = false,
  sx,
  ...other
}: AreaChartCardProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const effectiveColor = color || theme.palette.primary.main;
  // Determine available timeframe options from the keys of the chart prop
  const availableOptions = Object.keys(chart) as TimeframeKey[];
  const [selectedSeries, setSelectedSeries] = useState<TimeframeKey>(availableOptions[0]);
  const realtimeData = chart[selectedSeries];

  // Handle timeframe selection (if multiple options are provided)
  const handleChangeSeries = useCallback(
    (newValue: string) => {
      // Only switch if newValue is one of the known timeframe keys
      if (availableOptions.includes(newValue as TimeframeKey)) {
        setSelectedSeries(newValue as TimeframeKey);
      }
    },
    [availableOptions]
  );

  if (!realtimeData) {
    return <div>{t('No chart data available')}</div>;
  }

  // Choose value formatter based on whether we are showing percentages
  const formatValue = (val: number): string => {
    if (percentage) {
      // Format as percentage string (one decimal place for fractional percentages)
      const valRounded = Math.abs(val) < 10 ? val.toFixed(2) : val.toFixed(1);
      // Include a + sign for positive values (optional):
      // return (val >= 0 ? '+' : '') + valRounded + '%';
      return valRounded + '%';
    } else {
      // Default number shortening for large values (e.g., 15000 -> "15k")
      return fShortenNumber(val);
    }
  };

  // Prepare chart options with custom axis and tooltip formatters
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const chartOptions = useChart({
    colors: [effectiveColor],
    xaxis: {
      categories: realtimeData.categories,
      tickAmount: realtimeData.tickAmount,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => formatValue(value), // Use our formatter for y-axis ticks
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatValue(value), // Use our formatter for tooltip values
      },
    },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={t(title || 'Portfolio Value')}
        subheader={subheader}
        action={
          availableOptions.length > 1 ? (
            <ChartSelect
              options={availableOptions}
              value={selectedSeries}
              onChange={handleChangeSeries}
            />
          ) : null
        }
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={[effectiveColor]}
        labels={
          legendValues
            ? legendValues.map((v) => v.title)
            : realtimeData.series[0].data.map((item) => item.name)
        }
        values={
          legendValues
            ? legendValues.map((v) =>
                v.formatter ? v.formatter(v.number) : fShortenNumber(v.number)
              )
            : [formatValue(realtimeData.series[0].data[0].data.slice(-1)[0])]
        }
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        type="area"
        series={realtimeData.series[0].data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ pl: 1, py: 2.5, pr: 2.5, height: 320 }}
      />
    </Card>
  );
}
