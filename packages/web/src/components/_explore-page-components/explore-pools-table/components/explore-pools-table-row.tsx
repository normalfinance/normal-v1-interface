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
export interface ExplorePairsRow {
  address: string;
  assetName: string;
  price: string;
  fee: number;
  collateral: string;
  apr: number;
  volume1d: string;
  volume30d: string;
  tokenLong: Token;
  tokenShort: Token;
}

type Props = {
  row: ExplorePairsRow;
  index: number;
};

/* ------------------------------------------------------------------ */

export function ExplorePoolsTableRow({ row, index }: Props) {
  const router = useRouter();

  const onClickRow = () => router.push(paths.assets.details(row.address));

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
          {row.tokenLong && <PoolTokensAvatarGroup tokenA={row.tokenLong} tokenB={row.tokenLong} />}
          <Stack>
            <Typography variant="subtitle2">{row.assetName}</Typography>
          </Stack>
        </Stack>
      </TableCell>

      {/* Fee % ------------------------------------------------------- */}
      <TableCell>{fPercent(row.fee / 100)}</TableCell>

      {/* TVL ------------------------------------------------------- */}
      <TableCell>{fCurrency(row.collateral)}</TableCell>

      {/* Rewards % ------------------------------------------------------- */}
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" variant="soft" />
      </TableCell>

      {/* APR % ------------------------------------------------------- */}
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" variant="soft" />
        {/* {fPercent(row.apr)} */}
      </TableCell>

      {/* Volume ---------------------------------------------- */}
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" variant="soft" />
        {/* {fCurrency(row.volume1d)} */}
      </TableCell>
      <TableCell>
        <Chip label="Coming soon" color="info" size="small" variant="soft" />
        {/* {fCurrency(row.volume30d)} */}
      </TableCell>

      <TableCell align="right" sx={{ pr: 1 }}>
        <IconButton color="default" onClick={onClickRow}>
          <Iconify icon="eva:external-link-fill" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
