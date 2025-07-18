import type { TxType, PoolTxRow } from '@/types/pools';

import { useTranslate } from '@/locales';
import React, { useMemo, useState } from 'react';
import { fShortenNumber } from '@/utils/format-number';
import { fTruncate } from '@normalfinance/utils/build/format';
import { createStellarExpertUrl } from '@/utils/transactions.utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Chip,
  Menu,
  Card,
  Table,
  Paper,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
  TableSortLabel,
} from '@mui/material';

const typeColor: Record<TxType, 'success' | 'error' | 'warning' | 'info'> = {
  Buy: 'success',
  Sell: 'error',
  Deposit: 'warning',
  Withdraw: 'info',
};

function ago(sec: number) {
  // floor the entire subtraction so we get an integer second count
  const diff = Math.max(1, Math.floor(Date.now() / 1000 - sec));

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86_400)}d`;
}

type Order = 'asc' | 'desc' | undefined;
type ColumnKey = 'timestamp' | 'tokenAAmount' | 'tokenBAmount' | 'wallet';

// ----------------------------------------------------------------------

export const PoolTransactionsTable: React.FC<{
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  rows: PoolTxRow[];
}> = ({ baseTokenSymbol, quoteTokenSymbol, rows }) => {
  const theme = useTheme();

  // ------- local sort state ------------------------------------------
  const [orderBy, setOrderBy] = useState<ColumnKey>('timestamp');
  const [order, setOrder] = useState<Order>('desc'); // newest first by default

  // ------- type filter  ----------------------------------------------
  const [typeAnchor, setTypeAnchor] = useState<null | HTMLElement>(null);
  const [typeFilter, setTypeFilter] = useState<TxType | 'All'>('All');

  const { t } = useTranslate('auto');

  // -------------------------------------------------------------------
  const filtered = typeFilter === 'All' ? rows : rows.filter((r) => r.type === typeFilter);

  const ordered = useMemo(() => {
    if (!order) return filtered; // no sorting
    const sorted = [...filtered].sort((a, b) => {
      const valA = a[orderBy];
      const valB = b[orderBy];
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
    // special case: wallet grouping (just keeps equal wallets adjacent)
    return orderBy === 'wallet' ? sorted : sorted;
  }, [filtered, order, orderBy]);

  // -------------------------------------------------------------------
  const toggleSort = (key: ColumnKey) => {
    if (orderBy !== key) {
      setOrderBy(key);
      setOrder('desc');
    } else {
      setOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? undefined : 'desc'));
    }
  };

  // -------------------------------------------------------------------
  return (
    <Card sx={{ p: 1 }}>
      <Paper sx={{ width: '100%', overflow: 'auto' }}>
        <TableContainer
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.08) }}>
                <TableCell sortDirection={orderBy === 'timestamp' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'timestamp'}
                    direction={order === null ? 'asc' : (order ?? 'asc')}
                    onClick={() => toggleSort('timestamp')}
                    sx={{
                      '& .MuiTableSortLabel-icon': {
                        fontSize: 14, // affects the SVG size
                        width: 14,
                        height: 14,
                      },
                    }}
                  >
                    {t('Time')}
                  </TableSortLabel>
                </TableCell>

                {/* --- Type with dropdown -------------------------------- */}
                <TableCell>
                  <Typography
                    variant="subtitle2"
                    sx={{ cursor: 'pointer' }}
                    onClick={(e) => setTypeAnchor(e.currentTarget)}
                  >
                    {t('Type ▾')}
                  </Typography>
                  <Menu
                    open={Boolean(typeAnchor)}
                    anchorEl={typeAnchor}
                    onClose={() => setTypeAnchor(null)}
                  >
                    {(['All', 'Buy', 'Sell', 'Deposit', 'Withdraw'] as const).map((type) => (
                      <MenuItem
                        key={type}
                        selected={typeFilter === type}
                        onClick={() => {
                          setTypeFilter(type);
                          setTypeAnchor(null);
                        }}
                      >
                        {t(type)}
                      </MenuItem>
                    ))}
                  </Menu>
                </TableCell>

                {(['tokenAAmount', 'tokenBAmount'] as const).map((key) => (
                  <TableCell
                    key={key}
                    align="right"
                    sortDirection={orderBy === key ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === key}
                      direction={order === null ? 'asc' : (order ?? 'asc')}
                      onClick={() => toggleSort(key)}
                      sx={{
                        '& .MuiTableSortLabel-icon': {
                          fontSize: 14,
                          width: 14,
                          height: 14,
                        },
                      }}
                    >
                      {key === 'tokenBAmount' ? quoteTokenSymbol : baseTokenSymbol}
                    </TableSortLabel>
                  </TableCell>
                ))}

                <TableCell
                  sortDirection={orderBy === 'wallet' ? order : false}
                  onClick={() => toggleSort('wallet')}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography variant="subtitle2">{t('Wallet')}</Typography>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {ordered.map((row, idx) => {
                const stellarExpertUrl = createStellarExpertUrl('tx', row.txHash);

                return (
                  <TableRow
                    hover
                    key={idx}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <TableCell>{ago(row.timestamp)}</TableCell>
                    <TableCell>
                      <Chip label={row.type} color={typeColor[row.type]} size="small" />
                    </TableCell>
                    <TableCell align="right">{fShortenNumber(row.tokenAAmount)}</TableCell>
                    <TableCell align="right">{fShortenNumber(row.tokenBAmount)}</TableCell>
                    <TableCell>{fTruncate(row.wallet, 15)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Card>
  );
};

export default PoolTransactionsTable;
