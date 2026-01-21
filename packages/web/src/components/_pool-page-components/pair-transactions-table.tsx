import 'react-loading-skeleton/dist/skeleton.css';

import type { TxType, PairTxRow } from '@/types/pools';

import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import React, { useMemo, useState } from 'react';
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
  CardHeader,
  TableContainer,
  TableSortLabel,
} from '@mui/material';

import { TableSkeleton } from '@/components/template/table';

import AddressChip from '../_common/address-chip';

const typeColor: Record<TxType, 'success' | 'error' | 'secondary' | 'warning' | 'info'> = {
  Mint: 'success',
  Redeem: 'error',
  Buy: 'success',
  Sell: 'error',
  Deposit: 'info',
  Withdraw: 'warning',
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
type Order = 'asc' | 'desc' | undefined;
type ColumnKey = 'timestamp' | 'usdcAmount' | 'assetAmount' | 'user' | 'txHash';

// ----------------------------------------------------------------------

export const PairTransactionsTable: React.FC<{
  assetSymbol: string;
  rows: PairTxRow[];
  loading?: boolean;
}> = ({ assetSymbol, rows, loading }) => {
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
    <Card sx={{ p: 1 }}>
      <CardHeader
        sx={{ mb: 3 }}
        title={<Typography variant="h5">{t('Recent Transactions')}</Typography>}
        subheader={<Typography variant="caption">{t('Realtime')}</Typography>}
      />
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
                    {t('Type')}
                  </Typography>
                  <Menu
                    open={Boolean(typeAnchor)}
                    anchorEl={typeAnchor}
                    onClose={() => setTypeAnchor(null)}
                  >
                    {(['All', 'Buy', 'Sell', 'Mint', 'Redeem', 'Deposit', 'Withdraw'] as const).map(
                      (type) => (
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
                      )
                    )}
                  </Menu>
                </TableCell>

                {(['usdcAmount', 'assetAmount'] as const).map((key) => (
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
                      {key === 'assetAmount' ? assetSymbol : 'USD'}
                    </TableSortLabel>
                  </TableCell>
                ))}

                <TableCell
                  sortDirection={orderBy === 'user' ? order : false}
                  onClick={() => toggleSort('user')}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography variant="subtitle2">{t('User')}</Typography>
                </TableCell>

                <TableCell
                  sortDirection={orderBy === 'txHash' ? order : false}
                  onClick={() => toggleSort('txHash')}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography variant="subtitle2">{t('Transaction ID')}</Typography>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableSkeleton rowCount={8} cellCount={5} />
              ) : (
                ordered.map((row) => {
                  const stellarExpertUrl = createStellarExpertUrl('tx', row.txHash);

                  return (
                    <TableRow
                      hover
                      key={row.txHash}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <TableCell>
                        {row.timestamp ? `${format.ago(row.timestamp)} ago` : ''}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.type}
                          color={typeColor[row.type]}
                          size="small"
                          variant="soft"
                        />
                      </TableCell>
                      <TableCell>{format.fTokenAmount(row.usdcAmount, 7)}</TableCell>
                      <TableCell>{format.fTokenAmount(row.assetAmount, 7)}</TableCell>
                      <TableCell>
                        <AddressChip address={row.user} />
                      </TableCell>
                      <TableCell>{format.fTruncate(row.txHash, 15)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Card>
  );
};

export default PairTransactionsTable;
