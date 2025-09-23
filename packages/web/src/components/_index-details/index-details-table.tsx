import 'react-loading-skeleton/dist/skeleton.css';

import type { TxType, PoolTxRow, UiPoolTxRow } from '@/types/pools';

import { useTranslate } from '@/locales';
import { ago } from '@/utils/format-time';
import React, { useMemo, useState } from 'react';
import { fCurrency } from '@/utils/format-number';
import { fTruncate } from '@normalfinance/utils/build/format';

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
  TableSortLabel,
} from '@mui/material';

import { TableSkeleton } from '@/components/template/table';

const typeColor: Record<TxType, 'success' | 'error' | 'warning' | 'info'> = {
  Buy: 'success',
  Sell: 'error',
  Deposit: 'info',
  Withdraw: 'warning',
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
type Order = 'asc' | 'desc' | undefined;
type ColumnKey = 'timestamp' | 'tokenAAmount' | 'tokenBAmount' | 'user';

// ----------------------------------------------------------------------

export const IndexDetailsTable: React.FC<{
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  rows: UiPoolTxRow[];
  xlmPrice: number;
  loading?: boolean;
}> = ({ baseTokenSymbol, quoteTokenSymbol, rows, xlmPrice, loading }) => {
  const theme = useTheme();

  const typeTextColor: Record<TxType, string> = {
    Buy: theme.palette.success.main,
    Sell: theme.palette.error.main,
    Deposit: theme.palette.info.main,
    Withdraw: theme.palette.warning.main,
  };

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
    return orderBy === 'user' ? sorted : sorted;
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
    <Paper sx={{ width: '100%', overflow: 'auto' }}>
      <Card sx={{ borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) }}>
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
                  {t('Type')}
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
                <TableCell key={key} sortDirection={orderBy === key ? order : false}>
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
                sortDirection={orderBy === 'user' ? order : false}
                onClick={() => toggleSort('user')}
                sx={{ cursor: 'pointer' }}
              >
                <Typography variant="subtitle2">{t('Wallet')}</Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableSkeleton rowCount={8} cellCount={5} />
            ) : (
              ordered.map((row, idx) => {
                const poolPrice = row.tokenBAmount / row.tokenAAmount;
                const baseFiatValue = poolPrice * row.tokenAAmount * xlmPrice;
                const quoteFiatValue = row.tokenBAmount * xlmPrice;

                return (
                  <TableRow hover key={idx}>
                    <TableCell>{row.timestamp ? `${ago(row.timestamp / 1000)} ago` : ''}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.type}
                        color={typeColor[row.type]}
                        size="small"
                        sx={{
                          borderRadius: 9999,
                          px: 1,
                          height: 32,
                          border: `1px solid ${theme.palette.divider}`,
                          backgroundColor: alpha(theme.palette.grey[500], 0.08),
                          color: typeTextColor[row.type],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.tokenAAmount} ({fCurrency(baseFiatValue)})
                    </TableCell>
                    <TableCell>
                      {row.tokenBAmount} ({fCurrency(quoteFiatValue)})
                    </TableCell>
                    <TableCell>{fTruncate(row.user, 15)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </Paper>
  );
};

export default IndexDetailsTable;
