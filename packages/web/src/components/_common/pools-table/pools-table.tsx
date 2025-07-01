import type { TxType, PoolTxRow } from '@/types/pools';

import { useTranslate } from '@/locales';
import React, { useMemo, useState } from 'react';

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
  Mint: 'warning',
  Redeem: 'info',
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
type ColumnKey = 'timestamp' | 'usdValue' | 'usdcValue' | 'ethValue' | 'wallet';

// ----------------------------------------------------------------------

export const PoolsTable: React.FC<{ rows: PoolTxRow[] }> = ({ rows }) => {
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
                    {(['All', 'Buy', 'Sell', 'Mint', 'Redeem'] as const).map((type) => (
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

                {(['usdValue', 'usdcValue', 'ethValue'] as const).map((key) => (
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
                      {key === 'usdValue' ? 'USD' : key === 'usdcValue' ? 'USDC' : 'ETH'}
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
              {ordered.map((row, idx) => (
                <TableRow hover key={idx}>
                  <TableCell>{ago(row.timestamp)}</TableCell>
                  <TableCell>
                    <Chip label={row.type} color={typeColor[row.type]} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    {row.usdValue.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                  <TableCell align="right">{row.usdcValue.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.ethValue.toFixed(3)}</TableCell>
                  <TableCell>{row.wallet}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Card>
  );
};

export default PoolsTable;
