'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

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
}

/* -------------------------------------------------- */
/* component                                           */
/* -------------------------------------------------- */
export default function ExploreStats({ stats, sx }: ExploreStatsProps) {
  return (
    <Card sx={[{ mb: { xs: 3, md: 5 } }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Scrollbar sx={{ minHeight: 108 }}>
        <Stack
          direction="row"
          sx={{ py: 2 }}
          divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
        >
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
