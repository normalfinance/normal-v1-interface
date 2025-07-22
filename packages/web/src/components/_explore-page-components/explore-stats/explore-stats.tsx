'use client';

import 'react-loading-skeleton/dist/skeleton.css';

import type { Theme, SxProps } from '@mui/material/styles';

import Skeleton from 'react-loading-skeleton';

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
  loading?: boolean;
}

/* -------------------------------------------------- */
/* component                                           */
/* -------------------------------------------------- */
export default function ExploreStats({ stats, sx, loading }: ExploreStatsProps) {
  if (loading) {
    return (
      <Card sx={[{ mb: { xs: 3, md: 5 } }, ...(Array.isArray(sx) ? sx : [sx])]}>
        <Scrollbar sx={{ minHeight: 108 }}>
          <Stack
            direction="row"
            sx={{ py: 2 }}
            divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <Stack key={idx} spacing={1} sx={{ flex: 1, textAlign: 'center', px: 2 }}>
                <Skeleton height={16} width="60%" style={{ margin: '0 auto' }} />
                <Skeleton height={32} width="40%" style={{ margin: '0 auto' }} />
                <Skeleton height={12} width="30%" style={{ margin: '0 auto' }} />
              </Stack>
            ))}
          </Stack>
        </Scrollbar>
      </Card>
    );
  }

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
