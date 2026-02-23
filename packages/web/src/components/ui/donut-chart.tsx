'use client';

import { useMemo, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
    totalLabel?: string; // e.g. "Total"
    totalValueUsd: number;
    series: DonutChartSeriesItem[];
    colors?: string[];
    options?: ApexOptions;
};

export default function DonutChart({
    totalLabel = 'Total',
    totalValueUsd,
    series,
    colors,
    options,
}: Props) {
    const theme = useTheme();

    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const chartSeries = useMemo(() => series.map((s) => s.value), [series]);

    const displayLabel = hoverIndex != null ? series[hoverIndex]?.label ?? totalLabel : totalLabel;
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
                dataPointMouseEnter: (_event: any, _chartCtx: any, config: any) => {
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
                    // ✅ Disable Apex's center labels completely; we render our own overlay
                    labels: { show: false },
                },
            },
        },

        ...options,
    });

    return (
        <Box sx={{ position: 'relative', width: CHART_SIZE, height: CHART_SIZE }}>
            <StyledChart dir="ltr" type="donut" series={chartSeries} options={chartOptions} />

            {/* ✅ Center overlay (always visible, label below value, updates on hover) */}
            <Stack
                spacing={0.5}
                alignItems="center"
                justifyContent="center"
                sx={{
                    position: 'absolute',
                    inset: 0,
                    textAlign: 'center',
                    pointerEvents: 'none', // don't block hover on chart
                }}
            >
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

                <Typography
                    sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 14,
                        fontWeight: 600,
                    }}
                >
                    {displayLabel}
                </Typography>
            </Stack>
        </Box>
    );
}
