import type { CardProps } from '@mui/material/Card';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';

import type { IndexDetails } from '@normalfinance/types';

import { ChartLegends } from '@/components/template/chart';
import IndexDonutChart from './index-donut-chart';

type Props = CardProps & {
  index: IndexDetails;
  title?: string;
  subheader?: string;
};

export default function IndexPieChart({
  index,
  title = 'Index Assets Overview',
  subheader = 'A consolidated snapshot of every underlying holding in the index.',
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  const labels = index.constituents.map((c) => c.shortname ?? c.name);
  const values = index.constituents.map((c) => c.weightPct);

  const paletteSwatches = [
    theme.palette.primary.lighter,
    theme.palette.primary.light,
    theme.palette.primary.main,
    theme.palette.primary.dark,
    theme.palette.primary.darker,
    theme.palette.secondary.lighter,
    theme.palette.secondary.light,
    theme.palette.secondary.main,
    theme.palette.secondary.dark,
    theme.palette.secondary.darker,
  ];
  const chartColors = labels.map((_, idx) => paletteSwatches[idx % paletteSwatches.length]);

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ p: 4, pb: 0 }} />

      <IndexDonutChart
        labels={labels}
        values={values}
        colors={chartColors}
        sx={{
          my: 6,
          mx: 'auto',
          width: { xs: 240, xl: 260 },
          height: { xs: 240, xl: 260 },
        }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ChartLegends labels={labels} colors={chartColors} sx={{ p: 3, justifyContent: 'center' }} />
    </Card>
  );
}
