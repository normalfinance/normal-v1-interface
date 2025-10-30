'use client';

import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useRouter } from 'next/navigation';
import { fPercent, fCurrency } from '@/utils/format-number';

import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Chip, IconButton } from '@mui/material';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';
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
  tokenA: Token;
  tokenB: Token;
}

type Props = {
  row: ExplorePoolsRow;
  index: number;
};

/* ------------------------------------------------------------------ */

export function ExplorePoolsTableRow({ row, index }: Props) {
  const router = useRouter();

  const onClickRow = () => router.push(paths.pools.details(row.address));

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={onClickRow}
      data-testid={`explore-pools-table-row-${index}`}
    >
      {/* Rank (#) ---------------------------------------------------- */}
      <TableCell>{index}</TableCell>

      {/* Name + symbol + avatar ------------------------------------ */}
      <TableCell sx={{ minWidth: 160 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {row.tokenA && row.tokenB && (
            <PoolTokensAvatarGroup tokenA={row.tokenA} tokenB={row.tokenB} />
          )}
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
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" sx={{ mb: 2 }} />
        {/* {fPercent(row.apr)} */}
      </TableCell>

      {/* Volume ---------------------------------------------- */}
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" sx={{ mb: 2 }} />
        {/* {fCurrency(row.volume1d)} */}
      </TableCell>
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" sx={{ mb: 2 }} />
        {/* {fCurrency(row.volume30d)} */}
      </TableCell>

      {/* Ratio -------------------------------------------------- */}
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" sx={{ mb: 2 }} />
        {/* {fShortenNumber(row.ratio)} */}
      </TableCell>

      <TableCell align="right" sx={{ pr: 1 }}>
        <IconButton color="default" onClick={onClickRow}>
          <Iconify icon="eva:external-link-fill" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
