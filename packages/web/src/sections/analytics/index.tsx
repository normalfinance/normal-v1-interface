'use client';

import type { LegendValue } from '@/components/_common/area-chart-card';

import { DashboardContent } from '@/layouts/dashboard';
import { fCurrencyCompact } from '@/utils/format-number';
import { AreaChartCard } from '@/components/_common/area-chart-card';
import { VolumeChartCard } from '@/components/_analytics-page-components/volume-chart-card';
import { createChartData, type RealtimeChartData } from '@/utils/portfolio-value-chart-series';

import Grid2 from '@mui/material/Grid2';
import { Stack, useTheme, Typography } from '@mui/material';

export default function AnalyticsView() {
  const theme = useTheme();

  // -------------------------
  // Hardcoded chart data arrays.
  // -------------------------

  const data24h = [
    3444, 3600, 3750, 3900, 4100, 4300, 4500, 4700, 4900, 5200, 5400, 5500, 5650, 5800, 6000, 6200,
    6400, 6600, 6800, 7000, 7200, 7300, 7320, 7334,
  ];
  const data7d = [3444, 4000, 4800, 8200, 5800, 6800, 7334];
  const data30d = [
    3444, 3500, 3600, 3700, 3800, 3900, 4000, 4200, 4300, 4400, 4500, 4600, 4800, 5000, 5200, 5400,
    5600, 5800, 6000, 6200, 6400, 6600, 6800, 7000, 7100, 7200, 7250, 7300, 7320, 7330, 7334,
  ];
  // Hardcoded 12 month data

  // Create chart data objects using our helper.
  const chartData24h: RealtimeChartData = createChartData('24h', data24h, 8);
  const chartData7d: RealtimeChartData = createChartData('7d', data7d, 7);
  const chartData30d: RealtimeChartData = createChartData('30d', data30d, 8);
  const chartData1y: RealtimeChartData = createChartData('30d', data30d, 8);

  // Combine chart data into one object.
  const portfolioChartData: { [key in '24h' | '7d' | '30d']: RealtimeChartData } = {
    '24h': chartData24h,
    '7d': chartData7d,
    '30d': chartData30d,
  };

  const myLegendValues: LegendValue[] = [
    { title: 'Balance', number: 7334, formatter: fCurrencyCompact },
  ];

  // ---

  const volumeChartData: { [key in 'Week' | 'Month' | 'Year']: RealtimeChartData } = {
    Week: chartData7d,
    Month: chartData30d,
    Year: chartData1y,
  };

  // TODO: make this so the bar chart data stacks the two value like <AppAreaInstalled> from the UI template
  const volumeLegendValues: LegendValue[] = [
    { title: 'Synth', number: 7334, formatter: fCurrencyCompact },
    { title: 'Index', number: 7334, formatter: fCurrencyCompact },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Metrics and dashboards on usage of the Normal Protocol
        </Typography>
      </Stack>
      {/* First row: Normal TVL/Normal Voume */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <AreaChartCard
            id="normal_tvl"
            title="Normal TVL"
            chart={portfolioChartData}
            legendValues={myLegendValues}
            color={theme.palette.primary.main} // for example, using a different color
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <VolumeChartCard
            id="normal_volume"
            title="Normal Volume"
            subheader="past month" // TODO: make this update to show the beginning timeframe with the selected option
            chart={volumeChartData}
            legendValues={volumeLegendValues}
            color={theme.palette.primary.main} // for example, using a different color
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
