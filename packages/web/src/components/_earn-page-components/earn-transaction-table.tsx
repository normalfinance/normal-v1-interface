'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { fCurrency } from '@/utils/format-number';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Typography,
  TableContainer,
  TableSortLabel,
} from '@mui/material';

export type EarnTxStatus = 'Complete' | 'Pending' | 'Failed';
export type EarnTxType = 'Blend' | 'Liquidity Deposit' | 'Liquidity Withdraw' | 'Deposit' | 'Withdraw';

export type EarnTransactionRow = {
  id: string;
  timestamp?: number | Date | string;
  type: EarnTxType;
  asset: string;
  amountUsd: number;
  status: EarnTxStatus;
};

type Order = 'asc' | 'desc' | undefined;
type ColumnKey = 'timestamp' | 'type' | 'asset' | 'amountUsd' | 'status';

export type EarnTransactionsTableProps = {
  title?: string;
  rows: EarnTransactionRow[];
  sx?: SxProps<Theme>;
};

const typeChipSxByType: Record<EarnTxType, any> = {
  Blend: { color: 'success.main' },
  'Liquidity Deposit': { color: 'info.main' },
  'Liquidity Withdraw': { color: 'warning.main' },
  Deposit: { color: 'info.main' },
  Withdraw: { color: 'error.main' },
};

export function EarnTransactionsTable({ title, rows, sx }: EarnTransactionsTableProps) {
  const theme = useTheme();
  const { t } = useTranslate();

  const [orderBy, setOrderBy] = React.useState<ColumnKey>('timestamp');
  const [order, setOrder] = React.useState<Order>('desc');

  const toggleSort = (key: ColumnKey) => {
    if (orderBy !== key) {
      setOrderBy(key);
      setOrder('desc');
      return;
    }
    setOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? undefined : 'desc'));
  };

  const ordered = React.useMemo(() => {
    if (!order) return rows;

    const getTimeValue = (v: EarnTransactionRow['timestamp']) => {
      if (v == null) return 0;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.getTime();
      return 0;
    };

    return [...rows].sort((a, b) => {
      const valA =
        orderBy === 'timestamp' ? getTimeValue(a.timestamp) : (a as any)[orderBy] ?? '';
      const valB =
        orderBy === 'timestamp' ? getTimeValue(b.timestamp) : (b as any)[orderBy] ?? '';

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, order, orderBy]);

  const statusColor = (s: EarnTxStatus) => {
    if (s === 'Complete') return theme.palette.success.main;
    if (s === 'Pending') return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const renderTime = (ts?: EarnTransactionRow['timestamp']) => {
    if (typeof ts === 'string') return ts;
    if (typeof ts === 'number') return `${format.ago(ts)} ago`;
    if (ts instanceof Date) return `${format.ago(ts.getTime())} ago`;
    return '';
  };

  return (
    <Box sx={{ ...((sx as any) ?? {}) }}>
      {/* Header */}
      {title ? (
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          {t(title)}
        </Typography>
      ) : null}

      {/* Table */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: alpha(theme.palette.grey[500], 0.08),
                  '& th': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontWeight: 700,
                    color: 'text.secondary',
                    py: 2,
                  },
                }}
              >
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={orderBy === 'timestamp'}
                    direction={order === null ? 'asc' : (order ?? 'asc')}
                    onClick={() => toggleSort('timestamp')}
                    sx={{
                      '& .MuiTableSortLabel-icon': { fontSize: 14, width: 14, height: 14 },
                    }}
                  >
                    {t('Time')}
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ minWidth: 220 }}>
                  <TableSortLabel
                    active={orderBy === 'type'}
                    direction={order === null ? 'asc' : (order ?? 'asc')}
                    onClick={() => toggleSort('type')}
                    sx={{
                      '& .MuiTableSortLabel-icon': { fontSize: 14, width: 14, height: 14 },
                    }}
                  >
                    {t('Type')}
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ minWidth: 180 }}>{t('Asset')}</TableCell>

                <TableCell align="right" sx={{ minWidth: 140 }}>
                  <TableSortLabel
                    active={orderBy === 'amountUsd'}
                    direction={order === null ? 'asc' : (order ?? 'asc')}
                    onClick={() => toggleSort('amountUsd')}
                    sx={{
                      '& .MuiTableSortLabel-icon': { fontSize: 14, width: 14, height: 14 },
                    }}
                  >
                    {t('Amount')}
                  </TableSortLabel>
                </TableCell>

                <TableCell align="right" sx={{ minWidth: 140 }}>
                  {t('Status')}
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody
              sx={{
                '& td': {
                  py: 2.5,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
                },
                '& tr:last-of-type td': { borderBottom: 'none' },
              }}
            >
              {ordered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {renderTime(row.timestamp)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={t(row.type)}
                      size="small"
                      variant="soft"
                      sx={{
                        px: 1,
                        borderRadius: 999,
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                        ...typeChipSxByType[row.type],
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>{row.asset}</TableCell>

                  <TableCell align="right" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {fCurrency(row.amountUsd)}
                  </TableCell>

                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 700, color: statusColor(row.status) }}>
                      {t(row.status)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
