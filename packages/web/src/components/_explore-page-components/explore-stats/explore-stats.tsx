'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import type { Theme, SxProps } from '@mui/material/styles';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';

import { Spinner } from '@/components/_async/spinner';
import { Scrollbar } from '@/components/template/scrollbar'; // ⬅ adjust the path if yours is different

import { ExploreStat } from './explore-stat';

/* -------------------------------------------------- */
/* types                                               */
/* -------------------------------------------------- */
export interface SingleStat {
  title: string;
  total: number;
  percent: number;
  formatter: (value: number) => string;
}

export interface ExploreStatsProps {
  stats: SingleStat[];
  sx?: SxProps<Theme>;
  loading?: boolean;
}

/* -------------------------------------------------- */
/* component                                           */
/* -------------------------------------------------- */
export default function ExploreStats({ stats, sx, loading }: ExploreStatsProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card
        sx={[
          {
            mb: { xs: 3, md: 5 },
            minHeight: 228,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        data-testid="explore-stats-loading"
      >
        <Spinner size={40} />
      </Card>
    );
  }

  return (
    <Card
      sx={[
        {
          mb: { xs: 3, md: 5 },
          border: 1,
          borderColor: alpha(theme.palette.grey[500], 0.32),
          p: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      data-testid="explore-stats"
    >
      <Scrollbar sx={{ minHeight: 108 }}>
        <Stack direction="row" sx={{ py: 2 }} divider={<Divider orientation="vertical" flexItem />}>
          {stats.map((s) => (
            <ExploreStat
              key={s.title}
              title={s.title}
              total={s.total}
              percent={s.percent}
              formatter={s.formatter}
            />
          ))}
        </Stack>
      </Scrollbar>
    </Card>
  );
}
