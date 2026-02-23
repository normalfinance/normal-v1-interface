'use client';

import type { ApexOptions } from 'apexcharts';

import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { fNumber } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled, useTheme } from '@mui/material/styles';

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
  totalLabel?: string;
  totalValueUsd: number;
  series: DonutChartSeriesItem[];
  colors?: string[];
  options?: ApexOptions;
};

export default function DonutChart({
  totalLabel,
  totalValueUsd,
  series,
  colors,
  options,
}: Props) {
  const { t } = useTranslate();
  const theme = useTheme();

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartSeries = useMemo(() => series.map((s) => s.value), [series]);

  const resolvedTotalLabel = totalLabel ?? t('Total');

  const displayLabel =
    hoverIndex != null ? series[hoverIndex]?.label ?? resolvedTotalLabel : resolvedTotalLabel;

  const displayValue = hoverIndex != null ? series[hoverIndex]?.value ?? 0 : totalValueUsd;

  const formatUsd = (v: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(v);

  const chartOptions = useChart({
    chart: {
      sparkline: { enabled: true },
      events: {
        dataPointMouseEnter: (_event: unknown, _chartCtx: unknown, config: any) => {
          const idx = config?.dataPointIndex;
          if (typeof idx === 'number') setHoverIndex(idx);
        },
        dataPointMouseLeave: () => setHoverIndex(null),
        mouseLeave: () => setHoverIndex(null),
      },
    },

    labels: series.map((s) => s.label),
    colors: colors ?? ['#20E3A2', '#BBD3FB', '#2775CA'],

    legend: { show: false },
    dataLabels: { enabled: false },

    stroke: {
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
          size: '78%',
          labels: { show: false },
        },
      },
    },

    ...options,
  });

  return (
    <Box sx={{ position: 'relative', width: CHART_SIZE, height: CHART_SIZE }}>
      <StyledChart dir="ltr" type="donut" series={chartSeries} options={chartOptions} />

      {/* Center overlay */}
      <Stack
        spacing={0.5}
        alignItems="center"
        justifyContent="center"
        sx={{
          position: 'absolute',
          inset: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >

        <Typography
          sx={{
            color: theme.palette.text.secondary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {displayLabel}
        </Typography>

         <Typography
          sx={{
            color: theme.palette.text.primary,
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {formatUsd(displayValue)}
        </Typography>
      </Stack>
    </Box>
  );
}
