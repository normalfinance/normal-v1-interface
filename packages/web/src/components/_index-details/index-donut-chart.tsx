import type { ApexOptions } from 'apexcharts';

import ReactApexChart from 'react-apexcharts';

import { styled, useTheme } from '@mui/material/styles';

interface DonutChartProps {
  labels: string[];
  values: number[];
  colors?: string[];
  height?: number | string;
  width?: number | string;
  sx?: object;
}

export default function IndexDonutChart({
  labels,
  values,
  colors,
  height = 260,
  width = '100%',
  sx,
}: DonutChartProps) {
  const theme = useTheme();

  const activeAssets = values.filter((v) => v > 0).length;

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      sparkline: { enabled: true },
    },
    labels,
    colors,
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { enabled: false },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: 24,
              formatter: (seriesName) => seriesName,
              fontSize: '14px',
              color: theme.palette.text.secondary,
            },
            value: {
              show: true,
              fontSize: '24px',
              formatter: (v) => `${v}%`,
              offsetY: -16,
              fontWeight: 700,
            },
            total: {
              show: true,
              showAlways: false,
              label: 'Total Assets',
              formatter: () => `${activeAssets}`,
              fontSize: '14px',
              color: theme.palette.text.secondary,
            },
          },
        },
      },
    },
    responsive: [{ breakpoint: 600, options: { chart: { height: 200 } } }],
  };

  return (
    <Root sx={sx}>
      <ReactApexChart
        type="donut"
        series={values}
        options={options}
        height={height}
        width={width}
      />
    </Root>
  );
}

const Root = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .apexcharts-series path, & .apexcharts-donut-series .apexcharts-donut-slice': {
    cursor: 'pointer',
  },
});
