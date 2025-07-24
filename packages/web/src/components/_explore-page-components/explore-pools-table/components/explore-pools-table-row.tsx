'use client';

import { paths } from '@/routes/paths';
import { useRouter } from 'next/navigation';
import { fPercent, fCurrency, fShortenNumber } from '@/utils/format-number';

import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import PoolTokensAvatarGroup from '@/components/_common/pool-tokens-avatar-group';

/* ------------------------------------------------------------------ */
/* Row props & type -------------------------------------------------- */
export interface ExplorePoolsRow {
  address: string;
  tokenAName: string;
  tokenBName: string;
  fee: number;
  tvl: number;
  apr: number;
  volume1d: number;
  volume30d: number;
  ratio: number;
}

type Props = {
  row: ExplorePoolsRow;
  index: number;
};

/* ------------------------------------------------------------------ */

export function ExplorePoolsTableRow({ row, index }: Props) {
  const router = useRouter();

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={() => router.push(paths.pools.details(row.address))}
      data-testid={`explore-pools-table-row-${index}`}
    >
      {/* Rank (#) ---------------------------------------------------- */}
      <TableCell>{index}</TableCell>

      {/* Name + symbol + avatar ------------------------------------ */}
      <TableCell sx={{ minWidth: 160 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PoolTokensAvatarGroup tokenAName={row.tokenAName} tokenBName={row.tokenBName} />
          <Stack>
            <Typography variant="subtitle2">{`${row.tokenAName} / ${row.tokenBName}`}</Typography>
          </Stack>
        </Stack>
      </TableCell>

      {/* Fee % ------------------------------------------------------- */}
      <TableCell>{fPercent(row.fee / 100)}</TableCell>

      {/* TVL ------------------------------------------------------- */}
      <TableCell>{fCurrency(row.tvl)}</TableCell>

      {/* APR % ------------------------------------------------------- */}
      <TableCell>{fPercent(row.apr)}</TableCell>

      {/* Volume ---------------------------------------------- */}
      <TableCell>{fCurrency(row.volume1d)}</TableCell>
      <TableCell>{fCurrency(row.volume30d)}</TableCell>

      {/* Ratio -------------------------------------------------- */}
      <TableCell>{fShortenNumber(row.ratio)}</TableCell>
    </TableRow>
  );
}
