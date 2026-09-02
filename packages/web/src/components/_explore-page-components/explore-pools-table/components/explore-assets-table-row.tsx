'use client';

import type { ChipOwnProps } from '@mui/material';
import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useRouter } from 'next/navigation';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { Chip, Avatar, IconButton } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

/* ------------------------------------------------------------------ */
/* Row props & type -------------------------------------------------- */
export interface ExploreAssetsRow {
  asset: string;
  address: string;
  status: string;
  price: string;
  scaledPrice: string;
  collateral: string;
  liquidity: string;
  volume1d: string;
  tokenLong: Token;
}

type Props = {
  row: ExploreAssetsRow;
  index: number;
};

/* ------------------------------------------------------------------ */

export function ExploreAssetsTableRow({ row, index }: Props) {
  const router = useRouter();

  const onClickRow = () => router.push(paths.assets.details(row.asset));

  const statusColor = (): ChipOwnProps['color'] => {
    switch (row.status) {
      case 'Active':
        return 'success';

      case 'Expired':
        return 'warning';

      case 'Inactive':
        return 'error';

      default:
        return 'info';
    }
  };

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={onClickRow}
      data-testid={`explore-assets-table-row-${index}`}
    >
      {/* Rank (#) ---------------------------------------------------- */}
      <TableCell>{index}</TableCell>

      {/* Name + symbol + avatar ------------------------------------ */}
      <TableCell sx={{ minWidth: 160 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {row.tokenLong && (
            <Avatar
              src={row.tokenLong.icon || getCryptoIconUrl(row.tokenLong.symbol)}
              alt={row.tokenLong.name}
              sx={{ width: 27, height: 27 }}
            />
          )}
          <Stack>
            <Typography variant="subtitle2">{row.asset}</Typography>
          </Stack>
        </Stack>
      </TableCell>

      {/* Scaled Price */}
      <TableCell>{fCurrency(row.scaledPrice)}</TableCell>

      {/* Collateral */}
      <TableCell>{fCurrency(row.collateral)}</TableCell>

      {/* Liquidity */}
      <TableCell>{fCurrency(row.liquidity)}</TableCell>

      {/* Volume */}
      <TableCell>{fCurrency(row.volume1d)}</TableCell>

      {/* Status */}
      <TableCell>
        <Chip label={row.status} color={statusColor()} size="small" variant="soft" />
      </TableCell>

      <TableCell align="right" sx={{ pr: 1 }}>
        <IconButton color="default" onClick={onClickRow}>
          <Iconify icon="eva:external-link-fill" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
