'use client';

import { ApexOptions } from 'apexcharts';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// utils
import { fNumber } from '@/utils/format-number';

// components
import { Chart, useChart } from '@/components/template/chart';

// ----------------------------------------------------------------------

const CHART_SIZE = 360;

const StyledChart = styled(Chart)(() => ({
  width: CHART_SIZE,
  height: CHART_SIZE,
  '& .apexcharts-canvas, .apexcharts-inner, svg, foreignObject': {
    width: '100% !important',
    height: '100% !important',
  },
}));

export type DonutChartSeriesItem = {
  label: string;
  value: number;
};

type Props = {
  totalLabel?: string; // "Total"
  totalValueUsd: number; // 12345.21
  series: DonutChartSeriesItem[]; // 3 segments
  colors?: string[];
  options?: ApexOptions; // allow overrides if needed
};

export default function DonutChart({
  totalLabel = 'Total',
  totalValueUsd,
  series,
  colors,
  options,
}: Props) {
  const theme = useTheme();

  const chartSeries = series.map((s) => s.value);

  const chartOptions = useChart({
    chart: {
      sparkline: { enabled: true },
    },
    labels: series.map((s) => s.label),
    colors: colors ?? ['#20E3A2', '#2775CA', '#BBD3FB'],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: {
      // subtle separation between segments like design
      width: 2,
      colors: [theme.palette.background.paper],
    },
    tooltip: {
      fillSeriesColor: false,
      y: {
        formatter: (value: number) => `$${fNumber(value)}`,
        title: { formatter: (seriesName: string) => seriesName },
      },
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '78%', // ring thickness similar to screenshot
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: 10,
              color: theme.palette.text.secondary,
              fontSize: '14px',
              fontWeight: 600,
              formatter: () => totalLabel,
            },
            value: {
              show: true,
              offsetY: -8,
              color: theme.palette.text.primary,
              fontSize: '32px',
              fontWeight: 800,
              formatter: () =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 2,
                }).format(totalValueUsd),
            },
            total: {
              show: false, // we display value via `value.formatter` above
            },
          },
        },
      },
    },
    ...options,
  });

  return (
    <Box sx={{ display: 'grid', placeItems: 'center' }}>
      <StyledChart dir="ltr" type="donut" series={chartSeries} options={chartOptions} />

      {/* Optional: extra accessibility label under chart (can remove) */}
      <Typography >
        {totalLabel}: {totalValueUsd}
      </Typography>
    </Box>
  );
}
