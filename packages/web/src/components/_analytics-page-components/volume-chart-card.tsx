'use client';
import { useTranslate } from '@/locales';

import type { CardProps } from '@mui/material/Card';
import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';

import { useState, useCallback } from 'react';
import { fNumber, fShortenNumber } from '@/utils/format-number';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartSelect, ChartLegends } from '@/components/template/chart';

import type { LegendValue } from '../_common/area-chart-card';

type Props = CardProps & {
  title?: string;
  subheader?: string;
  legendValues?: LegendValue[];
  /**
   * Optional palette color to override the default chart color.
   */
  color?: string;
  // Chart prop holds realtime chart data for each timeframe.
  chart: Partial<{
    Week: RealtimeChartData;
    Month: RealtimeChartData;
    Year: RealtimeChartData;
  }>;
};

export function VolumeChartCard({
  title,
  subheader,
  legendValues,
  color,
  chart,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  // Use provided color or fallback to theme palette primary
  const effectiveColor = color || theme.palette.primary.main;

  // Compute available timeframes based on provided keys
  const availableOptions = Object.keys(chart) as Array<'Week' | 'Month' | 'Year'>;
  const [selectedSeries, setSelectedSeries] = useState<(typeof availableOptions)[number]>(
    availableOptions[0]
  );

  // Retrieve data for the currently selected timeframe (may be undefined)
  const realtimeData = chart[selectedSeries];

  // Always call hooks before any conditional return to comply with the Rules of Hooks
  const chartOptions = useChart({
    chart: { stacked: true },
    colors: [effectiveColor],
    stroke: { width: 0 },
    xaxis: { categories: realtimeData?.categories || [] },
    tooltip: { y: { formatter: (value: number) => fNumber(value) } },
    plotOptions: { bar: { columnWidth: '40%' } },
    // ...chart.options,
  });

  // Show fallback UI when there is no data for the selected timeframe

  const handleChangeSeries = useCallback((newValue: string) => {
    if (newValue === 'Week' || newValue === 'Month' || newValue === 'Year') {
      setSelectedSeries(newValue);
    }
  }, []);

  if (!realtimeData) {
    return <div>{t('No chart data available')}</div>;
  }

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
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
            : [fShortenNumber(realtimeData.series[0].data[0].data.slice(-1)[0])]
        }
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        key={selectedSeries}
        type="bar"
        series={realtimeData?.series[0].data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 320,
        }}
      />
    </Card>
  );
}
