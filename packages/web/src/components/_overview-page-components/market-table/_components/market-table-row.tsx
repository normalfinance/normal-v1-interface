'use client';

import type { Market } from 'src/components/_overview-page-components/market-table/market-table'; // adjust the path as needed
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import { RouterLink } from 'src/routes/components';
import { Label } from 'src/components/label';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

type Props = {
  row: Market;
  selected: boolean;
  editHref: string;
};

import { LabelColor } from 'src/components/label';
import { fCurrency, fPercent } from '@/utils/format-number';

const statusColorMapping: Record<string, LabelColor> = {
  trending: 'info',
  new: 'primary',
  meme: 'warning',
  rwa: 'error',
  // fallback if needed
  default: 'default',
};

export function MarketTableRow({ row, selected, editHref }: Props) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <TableRow
      hover
      selected={selected}
      sx={{ cursor: 'pointer' }}
      onClick={() => router.push(row.url)}
    >
      {/* Name with avatar */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar alt={row.name} src={row.avatarUrl} />
          <Link component={RouterLink} href={editHref} color="inherit" sx={{ ml: 2 }}>
            {row.name}
          </Link>
        </Box>
      </TableCell>

      {/* Price */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fCurrency(row.price)}</TableCell>

      {/* Percentage Change */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fPercent(row.percentageChange)}</TableCell>

      {/* Performance */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.performance}</TableCell>

      {/* Status */}
      <TableCell>
        <Label variant="soft" color={statusColorMapping[row.status] || 'default'}>
          {row.status}
        </Label>
      </TableCell>

      {/* Action / Icon */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'end' }}>
          <Icon
            icon="mdi:keyboard-arrow-right"
            width="24"
            height="24"
            style={{ color: theme.palette.grey[600] }}
          />
        </Box>
      </TableCell>
    </TableRow>
  );
}
