'use client';

import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useRouter } from 'next/navigation';
import { fNumber, fPercent, fCurrency } from '@/utils/format-number';
import { isNormalToken, getCryptoIconUrl } from '@normalfinance/utils';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

export interface HoldingData {
  token: Token;
  value: number;
  percentage: number;
}

interface MyHoldingsTableRowProps {
  holding: HoldingData;
}

export default function MyHoldingsTableRow({ holding }: MyHoldingsTableRowProps) {
  const router = useRouter();
  const { token, value, percentage } = holding;

  const handleRowClick = () => {
    router.push(
      paths.assets.details(
        isNormalToken(token) ? token.symbol.replace(/^(sn|n)/, '') : token.symbol
      )
    );
  };

  const balanceDisplay = BigNumber(token.balance).toFixed(token.decimals > 4 ? 4 : token.decimals);

  return (
    <TableRow hover onClick={handleRowClick} sx={{ cursor: 'pointer' }}>
      {/* Asset name + icon */}
      <TableCell>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={token.icon || getCryptoIconUrl(token.symbol)}
            alt={token.name}
            sx={{ width: 32, height: 32 }}
          />
          <Stack>
            <Typography variant="subtitle2">{token.symbol}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {token.name}
            </Typography>
          </Stack>
        </Stack>
      </TableCell>

      {/* Balance */}
      <TableCell align="right">
        <Typography variant="body2">{fNumber(balanceDisplay)}</Typography>
      </TableCell>

      {/* Price */}
      {/* TODO: replace with .scaledPrice for Normal Tokens */}
      <TableCell align="right">
        <Typography variant="body2">{fCurrency(token.price)}</Typography>
      </TableCell>

      {/* Value */}
      <TableCell align="right">
        <Typography variant="subtitle2">{fCurrency(value)}</Typography>
      </TableCell>

      {/* Allocation % */}
      <TableCell align="right">
        <Typography variant="body2">{fPercent(percentage)}</Typography>
      </TableCell>
    </TableRow>
  );
}
