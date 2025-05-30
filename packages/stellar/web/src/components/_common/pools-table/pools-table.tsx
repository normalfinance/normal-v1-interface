import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
} from '@mui/material';

dayjs.extend(relativeTime);

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
export type TxType = 'Buy' | 'Sell' | 'Mint' | 'Redeem';

export interface PoolTxRow {
  /** JS epoch seconds */
  timestamp: number;
  type: TxType;
  usdValue: number;
  usdcValue: number;
  ethValue: number;
  wallet: string;
}

// ----------------------------------------------------------------------
// Demo data — newest first (already sorted)
// ----------------------------------------------------------------------
const MOCK_ROWS: PoolTxRow[] = [
  {
    timestamp: Math.floor(Date.now() / 1000) - 45,
    type: 'Buy',
    usdValue: 32000,
    usdcValue: 31990,
    ethValue: 10.24,
    wallet: 'GABCD…1234',
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 90,
    type: 'Sell',
    usdValue: 21000,
    usdcValue: 20990,
    ethValue: 6.75,
    wallet: 'GXYZ…9876',
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 180,
    type: 'Mint',
    usdValue: 50000,
    usdcValue: 49980,
    ethValue: 15.0,
    wallet: 'G123…ABCD',
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 300,
    type: 'Redeem',
    usdValue: 15000,
    usdcValue: 14990,
    ethValue: 4.5,
    wallet: 'G777…4444',
  },
];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const typeColor: Record<TxType, 'success' | 'error' | 'warning' | 'info'> = {
  Buy: 'success',
  Sell: 'error',
  Mint: 'warning',
  Redeem: 'info',
};

function formatAgo(sec: number) {
  return dayjs(sec * 1000).fromNow();
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------
export const PoolsTable: React.FC<{ rows?: PoolTxRow[] }> = ({ rows = MOCK_ROWS }) => {
  // Sort newest first just in case caller gives unsorted data
  const ordered = useMemo(() => [...rows].sort((a, b) => b.timestamp - a.timestamp), [rows]);

  return (
    <Paper sx={{ width: '100%', overflow: 'auto' }}>
      <TableContainer>
        <Table stickyHeader aria-label="pools transactions table">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2">Time</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Type</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2">USD</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2">USDC</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2">ETH</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Wallet</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map((row, idx) => (
              <TableRow hover key={idx} sx={{ cursor: 'pointer' }}>
                <TableCell>{formatAgo(row.timestamp)}</TableCell>
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
  );
};

export default PoolsTable;
