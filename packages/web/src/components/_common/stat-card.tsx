import type { CardProps } from '@mui/material/Card';
import type { ChartProps, ChartOptions } from '@/components/template/chart';

import { useTranslate } from '@/locales';
import { fNumber, fPercent, fShortenNumber } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Stack } from '@mui/material';
import { alpha , useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';
import { Chart, useChart } from '@/components/template/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  description?: string;
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
  description,
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
  const { t } = useTranslate('auto');

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
    <Box
      sx={{
        gap: 0.5,
        display: 'inline-flex',
        alignItems: 'center',
        px: '12px',
        py: '6px',
        backgroundColor: 'grey.100',
        border: 1,
        borderColor: 'divider',
        borderRadius: 9999,
      }}
    >
      <Iconify
        width={16}
        icon={
          percent < 0
            ? 'solar:double-alt-arrow-down-bold-duotone'
            : 'solar:double-alt-arrow-up-bold-duotone'
        }
        sx={{ color: percent < 0 ? 'error.main' : 'success.main' }}
      />

      <Box component="span" sx={{ typography: 'subtitle2', fontWeight: 700 }}>
        {percent > 0 && '+'}
        {fPercent(percent)}
      </Box>

      <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
        {t('last 7 days')}
      </Box>
    </Box>
  );

  // Use provided formatter or default to fShortenNumber
  const formatTotal = formatter || fShortenNumber;

  return (
    <Card
      sx={[
        {
          p: 4,
          borderRadius: 3,
          alignItems: 'center',
          border: 1,
          borderColor: alpha(theme.palette.grey[500], 0.32),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* TODO: @niko this needs to be fixes from merge conflict */}
      <Box sx={{ typography: 'h5', fontSize: 20, mb: 1 }}>{t(title)}</Box>
      {description && (
        <Box sx={{ typography: 'body1', color: 'text.secondary', fontSize: 14 }}>
          {t(description)}
        </Box>
      )}

      <Stack direction="row" mt={8}>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ typography: 'subtitle2' }}>{t(title)}</Box>

          <Box
            sx={{ my: 1.5, typography: 'h3', fontSize: 32 }}
            data-testid={`stat-card-total-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {formatTotal(total)}
          </Box>

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
      </Stack>
    </Card>
  );
}
