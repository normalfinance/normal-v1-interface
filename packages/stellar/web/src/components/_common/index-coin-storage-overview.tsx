import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { Chart, useChart } from 'src/components/chart';
import { IndexCoin } from '@/types/indexes';

import { fRawPercent, fCurrencyTwoDecimals } from 'src/utils/format-number';
import { Button } from '@mui/material';

type ChartConfig = {
  colors?: string[];
  options?: ChartOptions;
};

type Props = CardProps & {
  total: number;
  data: IndexCoin[];
  chart?: ChartConfig;
  onRemoveCoin?: (id: number) => void;
  onReplaceCoin?: (id: number) => void;
};

export function IndexCoinStorageOverview({
  data,
  total,
  chart,
  onRemoveCoin,
  onReplaceCoin,
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  // If colors are provided, use them; otherwise default to two theme-based colors
  const chartColors = chart?.colors ?? [
    theme.palette.secondary.main,
    theme.palette.secondary.light,
  ];

  // Sum all coin percentages for the radial bar chart
  const sumOfIndexPercentages = data.reduce((acc, coin) => acc + (coin.indexPercentage ?? 0), 0);

  // Merge optional chart config
  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    stroke: { width: 0 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: chartColors[0], opacity: 1 },
          { offset: 100, color: chartColors[1], opacity: 1 },
        ],
      },
    },
    plotOptions: {
      radialBar: {
        offsetY: 40,
        startAngle: -90,
        endAngle: 90,
        hollow: { margin: -24 },
        track: { margin: -24 },
        dataLabels: {
          name: { offsetY: 8 },
          value: { offsetY: -36 },
          total: {
            // We'll just display "Used of 100% allocation"
            label: `Used of 100% allocation`,
            color: theme.vars.palette.text.disabled,
            fontSize: theme.typography.caption.fontSize as string,
            fontWeight: theme.typography.caption.fontWeight,
          },
        },
      },
    },
    // Spread any additional chart options
    ...(chart?.options || {}),
  });

  return (
    <Box sx={sx} {...other}>
      {/* Radial bar uses sumOfIndexPercentages as the data series */}
      <Chart
        type="radialBar"
        series={[sumOfIndexPercentages]}
        options={chartOptions}
        sx={{ mx: 'auto', width: 240, height: 240 }}
      />

      <Stack
        spacing={3}
        sx={{
          px: 0,
          pb: 5,
          mt: -4,
          zIndex: 1,
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        {data.map((coin) => (
          <Button
            key={coin.id}
            sx={{
              gap: 2,
              display: 'flex',
              alignItems: 'center',
              typography: 'subtitle2',
            }}
            onClick={() => onReplaceCoin?.(coin.id)}
          >
            <Box sx={{ width: 36, height: 36 }} component="img" src={coin.url} alt={coin.name} />

            <Stack flex="1 1 auto" textAlign={'left'}>
              <div>{coin.name}</div>
              <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                {coin.shortName}
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Stack flex="1 1 auto" textAlign="right">
                <div>{fRawPercent(coin.indexPercentage)}</div>
                <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                  {fCurrencyTwoDecimals(coin.price)}
                </Box>
              </Stack>
              <Button
                sx={{
                  color: theme.vars.palette.error.main,
                  fontSize: '12px',
                }}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCoin?.(coin.id);
                }}
              >
                Remove
              </Button>
            </Box>
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
