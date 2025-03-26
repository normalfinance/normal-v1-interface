import type { CardProps } from '@mui/material/Card';
import type { ChartOptions, ChartProps } from 'src/components/chart';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

// Import all formatting functions
import { fNumber, fCurrency, fPercent, fShortenNumber, fData } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  total: number;
  percent: number;
  /**
   * Optional formatter function for total.
   * E.g. fNumber, fCurrency, fPercent, fShortenNumber, or fData.
   */
  formatter?: (value: number) => string;
  chartType?: ChartProps['type'];
  displayChart?: boolean;
  chart: {
    colors?: string[];
    categories: string[];
    series: number[];
    options?: ChartOptions;
  };
};

export function StatCard({
  title,
  percent,
  total,
  formatter,
  chart,
  chartType = 'line',
  displayChart = true,
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.light, theme.palette.primary.main];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: [chartColors[1]],
    xaxis: { categories: chart.categories },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => (formatter ? formatter(value) : fNumber(value)),
        title: { formatter: () => '' },
      },
    },
    // Add custom plotOptions for bar charts:
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%', // adjust percentage to get approx. 5px bar width based on container & category count
        borderRadius: 1,
        borderRadiusApplication: 'end', // rounds only the top corners
      },
    },
    ...chart.options, // merge any additional options passed in
  });

  const renderTrending = () => (
    <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
      <Box
        component="span"
        sx={{
          width: 24,
          height: 24,
          display: 'flex',
          borderRadius: '50%',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
          color: 'success.dark',
          ...theme.applyStyles('dark', {
            color: 'success.light',
          }),
          ...(percent < 0 && {
            bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
            color: 'error.dark',
            ...theme.applyStyles('dark', {
              color: 'error.light',
            }),
          }),
        }}
      >
        <Iconify
          width={16}
          icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
        />
      </Box>

      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>

      <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
        last 7 days
      </Box>
    </Box>
  );

  // Use provided formatter or default to fShortenNumber
  const formatTotal = formatter || fShortenNumber;

  return (
    <Card
      sx={[{ p: 3, display: 'flex', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

        <Box sx={{ my: 1.5, typography: 'h3' }}>{formatTotal(total)}</Box>

        {renderTrending()}
      </Box>

      {displayChart && (
        <Chart
          type={chartType}
          series={[{ data: chart.series }]}
          options={chartOptions}
          sx={{ width: 58, height: 48 }}
        />
      )}
    </Card>
  );
}
