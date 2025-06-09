'use client';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

import { Chart } from '@/components/chart';
import { fCurrencyCompact, fPercent, fShortenNumber } from '@/utils/format-number';
import type { ApexOptions } from 'apexcharts';

/* ------------------------------------------------------------------ */
/* Row props & type -------------------------------------------------- */
export interface MarketRow {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  iconUrl: string;
  price: number;
  change1h: number;
  change1d: number;
  fdv: number;
  volume24h: number;
  spark: { series: number[]; categories: string[]; colors: string[] };
  url: string; // target route on click
}

type Props = {
  row: MarketRow;
  selected?: boolean;
};

/* ------------------------------------------------------------------ */

export function ExploreTokensTableRow({ row, selected }: Props) {
  const theme = useTheme();
  const router = useRouter();

  /* — Tiny sparkline chart options — */
  const chartOptions = {
    chart: { sparkline: { enabled: true } },
    stroke: { curve: 'smooth' as const, width: 2 }, // <- literal
    colors: row.spark.colors,
    tooltip: { enabled: false },
    xaxis: { categories: row.spark.categories },
  } satisfies ApexOptions;

  return (
    <TableRow
      hover
      selected={selected}
      sx={{ cursor: 'pointer' }}
      onClick={() => router.push(row.url)}
    >
      {/* Rank (#) ---------------------------------------------------- */}
      <TableCell>{row.rank}</TableCell>

      {/* Name + symbol + avatar ------------------------------------ */}
      <TableCell sx={{ minWidth: 160 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar src={row.iconUrl} alt={row.symbol} sx={{ width: 24, height: 24 }} />
          <Stack>
            <Typography variant="subtitle2">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.symbol}
            </Typography>
          </Stack>
        </Stack>
      </TableCell>

      {/* Price ------------------------------------------------------ */}
      <TableCell>{fCurrencyCompact(row.price)}</TableCell>

      {/* 1 H % ------------------------------------------------------- */}
      <TableCell sx={{ color: row.change1h >= 0 ? 'success.main' : 'error.main' }}>
        {fPercent(row.change1h)}
      </TableCell>

      {/* 1 D % ------------------------------------------------------- */}
      <TableCell sx={{ color: row.change1d >= 0 ? 'success.main' : 'error.main' }}>
        {fPercent(row.change1d)}
      </TableCell>

      {/* FDV & Volume ---------------------------------------------- */}
      <TableCell>{fShortenNumber(row.fdv)}</TableCell>
      <TableCell>{fShortenNumber(row.volume24h)}</TableCell>

      {/* Spark-line -------------------------------------------------- */}
      <TableCell align="center" sx={{ width: 120 }}>
        <Chart
          type="line"
          series={[{ data: row.spark.series }]}
          options={chartOptions}
          sx={{ width: 100, height: 66 }}
        />
      </TableCell>
    </TableRow>
  );
}
