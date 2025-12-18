import type { CardProps } from '@mui/material/Card';
import type { IndexFundComponent } from '@normalfinance/types';
import type { ChartOptions } from '@/components/template/chart';

import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from '@/components/template/chart';

type ChartConfig = {
  colors?: string[];
  options?: ChartOptions;
};

type Props = CardProps & {
  total: number;
  data: IndexFundComponent[];
  chart?: ChartConfig;
  onRemoveComponent?: (id: string) => void;
  onReplaceComponent?: (id: string) => void;
};

export function IndexComponentStorageOverview({
  data,
  total,
  chart,
  onRemoveComponent,
  onReplaceComponent,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const {
    tokenState: { tokensByAddress },
  } = usePersistStore();

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
        {data.map((component) => {
          const token = tokensByAddress[component.contract];

          return (
            <Button
              key={component.contract}
              sx={{
                gap: 2,
                display: 'flex',
                alignItems: 'center',
                typography: 'subtitle2',
              }}
              onClick={() => onReplaceComponent?.(token.contract)}
            >
              <Box
                sx={{ width: 36, height: 36 }}
                component="img"
                src={token.icon ?? getCryptoIconUrl(token.symbol)}
                alt={token.name}
              />

              <Stack flex="1 1 auto" textAlign="left">
                <div>{token.name}</div>
                <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                  {token.symbol}
                </Box>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Stack flex="1 1 auto" textAlign="right">
                  <div>{fRawPercent(component.indexPercentage)}</div>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {fCurrencyTwoDecimals(token.price)}
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
                    onRemoveComponent?.(token.contract);
                  }}
                >
                  {t('Remove')}
                </Button>
              </Box>
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
}
